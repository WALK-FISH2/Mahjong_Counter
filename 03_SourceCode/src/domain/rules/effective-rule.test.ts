import { describe, expect, it } from 'vitest';

import { commonSimpleRulePackage } from '../../content/rules/common-simple/parsed-rule-package';
import { buildEffectiveRule, EffectiveRuleAdjustmentError } from './effective-rule';

const baseRuleRef = Object.freeze({ ruleId: 'common-simple', ruleVersion: '1.0.0' });

describe('EffectiveRule', () => {
  it('applies every declared target kind without mutating the RulePackage', () => {
    const before = JSON.stringify(commonSimpleRulePackage);
    const effective = buildEffectiveRule(commonSimpleRulePackage, {
      baseRuleRef,
      values: {
        minimumFan: 8,
        'cap.enabled': true,
        'cap.value': 88,
        'selfDraw.mode': 'ADD',
        'selfDraw.value': 2,
        'pattern.pureStraight.enabled': false,
        'pattern.pureStraight.value': 18,
      },
    });

    expect(effective.legality.minimumFan).toBe(8);
    expect(effective.scoring.cap).toEqual({ enabled: true, value: 88 });
    expect(effective.scoring.extras?.find(({ extraId }) => extraId === 'selfDraw')).toMatchObject({
      mode: 'ADD',
      value: 2,
    });
    expect(effective.patterns.find(({ patternId }) => patternId === 'pureStraight')).toMatchObject({
      enabled: false,
      value: 18,
    });
    expect(JSON.stringify(commonSimpleRulePackage)).toBe(before);
    expect(commonSimpleRulePackage.legality.minimumFan).toBe(0);
  });

  it('rejects undeclared, invalid, missing-target, mismatched, and inconsistent values', () => {
    expect(() =>
      buildEffectiveRule(commonSimpleRulePackage, {
        baseRuleRef,
        values: { hiddenSwitch: true },
      }),
    ).toThrow(EffectiveRuleAdjustmentError);
    expect(() =>
      buildEffectiveRule(commonSimpleRulePackage, {
        baseRuleRef,
        values: { minimumFan: -1 },
      }),
    ).toThrow(EffectiveRuleAdjustmentError);
    expect(() =>
      buildEffectiveRule(commonSimpleRulePackage, {
        baseRuleRef: { ruleId: 'another-rule', ruleVersion: '1.0.0' },
        values: { minimumFan: 1 },
      }),
    ).toThrow(EffectiveRuleAdjustmentError);
    expect(() =>
      buildEffectiveRule(commonSimpleRulePackage, {
        baseRuleRef,
        values: { 'cap.enabled': true },
      }),
    ).toThrow(EffectiveRuleAdjustmentError);

    const missingTargetRule = {
      ...commonSimpleRulePackage,
      temporaryAdjustments: [
        {
          adjustmentId: 'ghost.value',
          target: { module: 'pattern' as const, patternId: 'ghost', field: 'value' as const },
          valueConstraint: { valueType: 'number' as const },
        },
      ],
    };
    expect(() =>
      buildEffectiveRule(missingTargetRule, {
        baseRuleRef,
        values: { 'ghost.value': 2 },
      }),
    ).toThrow(EffectiveRuleAdjustmentError);
  });

  it('returns the installed package unchanged when no override exists', () => {
    expect(buildEffectiveRule(commonSimpleRulePackage, null)).toBe(commonSimpleRulePackage);
    expect(buildEffectiveRule(commonSimpleRulePackage, { baseRuleRef, values: {} })).toBe(
      commonSimpleRulePackage,
    );
    expect(() =>
      buildEffectiveRule(commonSimpleRulePackage, {
        baseRuleRef: { ruleId: 'another-rule', ruleVersion: '1.0.0' },
        values: {},
      }),
    ).toThrow(EffectiveRuleAdjustmentError);
  });
});
