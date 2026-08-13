import { describe, expect, it } from 'vitest';

import { commonSimpleRulePackage } from '../../content/rules/common-simple/parsed-rule-package';
import {
  commonSimpleExtraScoringCalculatorRegistry,
  commonSimpleScoringStrategyRegistry,
} from '../../content/rules/common-simple/scoring-capabilities';
import { createWinContext, knownContextValue } from '../../domain/mahjong';
import type { RulePackageDefinition } from '../../domain/rules/rule-package';
import { evaluateQuickCalc, QuickCalcInputError } from './quick-calc';

const capabilities = {
  scoringStrategies: commonSimpleScoringStrategyRegistry,
  extraScoringCalculators: commonSimpleExtraScoringCalculatorRegistry,
};
const completeContext = createWinContext('discard', {
  seatWind: knownContextValue('east'),
  roundWind: knownContextValue('south'),
});

function evaluate(
  selectedPatternIds: readonly string[],
  rule: RulePackageDefinition = commonSimpleRulePackage,
  context = completeContext,
) {
  return evaluateQuickCalc(
    rule,
    {
      ruleRef: {
        ruleId: rule.manifest.ruleId,
        ruleVersion: rule.manifest.ruleVersion,
      },
      selectedPatternIds,
      context,
    },
    capabilities,
  );
}

describe('Quick Calc Application Use Case', () => {
  it('uses common-simple minimumFan 0, self-draw +1, no cap and preserves Rule Version', () => {
    const result = evaluate(
      ['selfDrawn'],
      commonSimpleRulePackage,
      createWinContext('self-draw', {
        seatWind: knownContextValue('east'),
        roundWind: knownContextValue('south'),
      }),
    );
    expect(result.ruleRef).toEqual({ ruleId: 'common-simple', ruleVersion: '1.0.0' });
    expect(result.unverifiedByHand).toBe(true);
    expect(result.score.total).toBe(1);
    expect(result.score.cap).toMatchObject({ enabled: false, value: null, applied: false });
    expect(result.legality).toEqual({ status: 'legal' });
  });

  it('uses the rule-declared flower extra for a manually selected flower pattern', () => {
    const result = evaluate(['flowerTiles']);
    expect(result.score.total).toBe(1);
    expect(result.score.extrasBeforeCap).toEqual([
      expect.objectContaining({ patternId: 'flowerTiles', occurrences: 1, subtotal: 1 }),
    ]);
  });

  it('reuses covers and mutex relation resolution for user-selected patterns', () => {
    const covered = evaluate(['fullyConcealedHand', 'concealedHand']);
    expect(covered.relation.counted.map(({ candidate }) => candidate.patternId)).toEqual([
      'fullyConcealedHand',
    ]);
    expect(covered.relation.excluded[0]).toMatchObject({
      candidate: { patternId: 'concealedHand' },
      reason: 'COVERED',
    });

    const mutex = evaluate(['edgeWait', 'closedWait', 'singleWait']);
    expect(mutex.relation.counted.map(({ candidate }) => candidate.patternId)).toEqual([
      'singleWait',
    ]);
    expect(mutex.relation.excluded).toHaveLength(2);
  });

  it('reuses minimumFan and cap without invoking a hand evaluator', () => {
    const strictRule: RulePackageDefinition = {
      ...commonSimpleRulePackage,
      legality: { ...commonSimpleRulePackage.legality, minimumFan: 8 },
      scoring: {
        ...commonSimpleRulePackage.scoring,
        cap: { enabled: true, value: 4 },
      },
    };
    const result = evaluate(['allPungs'], strictRule);
    expect(result.score.totalBeforeCap).toBe(6);
    expect(result.score.total).toBe(4);
    expect(result.score.cap.applied).toBe(true);
    expect(result.legality).toEqual({
      status: 'illegal',
      reasons: [{ reasonCode: 'MINIMUM_FAN_NOT_MET', data: { actualFan: 4, minimumFan: 8 } }],
    });
  });

  it('fails closed for unavailable patterns and mismatched Rule Versions', () => {
    expect(() => evaluate(['greaterHonorsAndKnittedTiles'])).toThrowError(QuickCalcInputError);
    expect(() =>
      evaluateQuickCalc(
        commonSimpleRulePackage,
        {
          ruleRef: { ruleId: 'common-simple', ruleVersion: '0.9.0' },
          selectedPatternIds: [],
          context: completeContext,
        },
        capabilities,
      ),
    ).toThrowError(QuickCalcInputError);
  });
});
