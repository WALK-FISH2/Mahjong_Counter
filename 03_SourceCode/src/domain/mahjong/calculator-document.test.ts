import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  createCalculatorDocument,
  type CalculatorDocument,
  type CalculatorDocumentSource,
  type RuleRef,
} from './calculator-document';
import { createWinContext, knownContextValue, UNKNOWN_CONTEXT_VALUE } from './context';
import { createHandSnapshot } from './hand';
import { createPungMeld } from './meld';
import { addTransientChowTile, startChowInput } from './meld-input-state';

describe('CalculatorDocument', () => {
  it('expresses every formal calculation input and roundtrips through plain JSON', () => {
    const transientInput = addTransientChowTile(startChowInput(), 's1');
    const document = createCalculatorDocument({
      schemaVersion: 1,
      ruleRef: { ruleId: 'common-simple', ruleVersion: '1.0.0' },
      hand: createHandSnapshot({
        concealed: ['m1', 'm2', 'm3'],
        melds: [createPungMeld('pung-east', 'east')],
        flowers: ['spring'],
        winningTile: 'm4',
      }),
      context: createWinContext('self-draw', {
        seatWind: UNKNOWN_CONTEXT_VALUE,
        lastTile: knownContextValue(false),
      }),
      temporaryRuleAdjustment: {
        baseRuleRef: { ruleId: 'common-simple', ruleVersion: '1.0.0' },
        values: {
          minimumFan: 0,
          cap: { enabled: true, value: 64 },
          enabledPatterns: ['allPungs', 'fullFlush'],
        },
      },
      fanAdjustments: [
        { patternId: 'selfDrawn', action: 'exclude' },
        {
          patternId: 'allPungs',
          action: 'force-include',
          confirmedConflictSignature: 'relation-v1',
        },
      ],
      transientInput,
      source: { kind: 'saved-example', exampleId: 'example-1' },
      revision: 7,
    });

    expect(JSON.parse(JSON.stringify(document))).toEqual(document);
    expect(document.transientInput).toEqual({ kind: 'chow', selected: ['s1'] });
    expect(document.hand.melds).toHaveLength(1);
    expectTypeOf<CalculatorDocument['ruleRef']>().toEqualTypeOf<RuleRef>();
    expectTypeOf<CalculatorDocument['source']>().toEqualTypeOf<CalculatorDocumentSource>();
  });

  it('uses explicit neutral defaults without adding future rule behavior', () => {
    const document = createCalculatorDocument({
      schemaVersion: 1,
      ruleRef: { ruleId: 'common-simple', ruleVersion: '1.0.0' },
      hand: createHandSnapshot(),
      context: createWinContext(),
    });

    expect(document).toMatchObject({
      temporaryRuleAdjustment: null,
      fanAdjustments: [],
      transientInput: { kind: 'none' },
      source: { kind: 'new' },
      revision: 0,
    });
  });

  it('takes immutable copies of mutable document inputs', () => {
    const fanAdjustments = [{ patternId: 'allPungs', action: 'exclude' }] as const;
    const adjustmentValues: Record<string, number> = { minimumFan: 0 };
    const document = createCalculatorDocument({
      schemaVersion: 1,
      ruleRef: { ruleId: 'common-simple', ruleVersion: '1.0.0' },
      hand: createHandSnapshot(),
      context: createWinContext(),
      temporaryRuleAdjustment: {
        baseRuleRef: { ruleId: 'common-simple', ruleVersion: '1.0.0' },
        values: adjustmentValues,
      },
      fanAdjustments,
    });

    adjustmentValues.minimumFan = 8;

    expect(document.temporaryRuleAdjustment?.values.minimumFan).toBe(0);
    expect(Object.isFrozen(document)).toBe(true);
    expect(Object.isFrozen(document.fanAdjustments)).toBe(true);
  });

  it('rejects non-serializable revision and numeric value boundaries', () => {
    const baseInput = {
      schemaVersion: 1,
      ruleRef: { ruleId: 'common-simple', ruleVersion: '1.0.0' },
      hand: createHandSnapshot(),
      context: createWinContext(),
    } as const;

    expect(() => createCalculatorDocument({ ...baseInput, revision: -1 })).toThrow(RangeError);
    expect(() =>
      createCalculatorDocument({
        ...baseInput,
        temporaryRuleAdjustment: {
          baseRuleRef: baseInput.ruleRef,
          values: { invalid: Number.NaN },
        },
      }),
    ).toThrow(RangeError);
  });
});
