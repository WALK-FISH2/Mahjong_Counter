import { describe, expect, it } from 'vitest';

import { commonSimplePatternRecognizerRegistry } from '../../../content/rules/common-simple/pattern-recognizers';
import { commonSimpleRulePackage } from '../../../content/rules/common-simple/parsed-rule-package';
import {
  commonSimpleExtraScoringCalculatorRegistry,
  commonSimpleScoringStrategyRegistry,
} from '../../../content/rules/common-simple/scoring-capabilities';
import { createHandSnapshot, createWinContext, knownContextValue } from '../../mahjong';
import { evaluateHand } from '../evaluation';
import { applyFanAdjustments, createFanAdjustment, inspectFanAdjustments } from './fan-adjustment';

const hand = createHandSnapshot({
  concealed: [
    'm1',
    'm2',
    'm3',
    'p1',
    'p2',
    'p3',
    's1',
    's2',
    's3',
    'east',
    'east',
    'east',
    'white',
  ],
  winningTile: 'white',
});
const context = createWinContext('discard', {
  seatWind: knownContextValue('south'),
  roundWind: knownContextValue('west'),
});
const evaluation = evaluateHand({
  hand,
  context,
  rule: commonSimpleRulePackage,
  patternRecognizers: commonSimplePatternRecognizerRegistry,
  scoringStrategies: commonSimpleScoringStrategyRegistry,
  extraScoringCalculators: commonSimpleExtraScoringCalculatorRegistry,
});
const candidate = evaluation.candidates[0]!;

function apply(adjustments: Parameters<typeof applyFanAdjustments>[0]['adjustments']) {
  return applyFanAdjustments({
    baseEvaluationStatus: evaluation.status,
    candidate,
    adjustments,
    hand,
    context,
    rule: commonSimpleRulePackage,
    scoringStrategies: commonSimpleScoringStrategyRegistry,
    extraScoringCalculators: commonSimpleExtraScoringCalculatorRegistry,
  });
}

describe('Fan Adjustment Domain', () => {
  it('only creates adjustments for recognized patterns in the required source state', () => {
    const counted = candidate.relation.counted[0]!.candidate.patternId;
    expect(createFanAdjustment(candidate, counted, 'exclude')).toEqual({
      patternId: counted,
      action: 'exclude',
    });
    expect(createFanAdjustment(candidate, 'not-recognized', 'exclude')).toBeNull();
    expect(createFanAdjustment(candidate, counted, 'force-include')).toBeNull();
  });

  it('changes the user display score but preserves the exact base legality object', () => {
    const counted = candidate.relation.counted[0]!.candidate.patternId;
    const adjustment = createFanAdjustment(candidate, counted, 'exclude')!;
    const result = apply([adjustment]);
    expect(result.score.total).not.toBe(candidate.score.total);
    expect(result.baseLegality).toBe(candidate.legality);
    expect(result.baseEvaluationStatus).toBe(evaluation.status);
  });

  it('retains stale adjustments without counting them and requires renewed conflict confirmation', () => {
    const counted = candidate.relation.counted[0]!.candidate.patternId;
    const stale = {
      patternId: counted,
      action: 'force-include' as const,
      confirmedConflictSignature: 'old',
    };
    expect(inspectFanAdjustments(candidate, [stale])).toEqual([
      { status: 'stale', adjustment: stale, reasonCode: 'TARGET_NOT_EXCLUDED' },
    ]);
    const result = apply([stale]);
    expect(result.score.total).toBe(candidate.score.total);
    expect(result.adjustmentStates[0]?.status).toBe('stale');
  });

  it('property: every available adjustment preserves base legality', () => {
    const adjustments = [
      ...candidate.relation.counted.map(({ candidate: pattern }) =>
        createFanAdjustment(candidate, pattern.patternId, 'exclude'),
      ),
      ...candidate.relation.excluded.map(({ candidate: pattern }) =>
        createFanAdjustment(candidate, pattern.patternId, 'force-include'),
      ),
    ].filter((adjustment) => adjustment !== null);
    expect(adjustments.length).toBeGreaterThan(0);
    for (const adjustment of adjustments) {
      const result = apply([adjustment]);
      expect(result.baseLegality).toEqual(candidate.legality);
      expect(result.baseEvaluationStatus).toBe(evaluation.status);
    }
  });
});
