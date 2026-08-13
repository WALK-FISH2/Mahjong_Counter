import { describe, expect, it, vi } from 'vitest';

import { commonSimplePatternRecognizerRegistry } from '../../content/rules/common-simple/pattern-recognizers';
import { commonSimpleRulePackage } from '../../content/rules/common-simple/parsed-rule-package';
import {
  commonSimpleExtraScoringCalculatorRegistry,
  commonSimpleScoringStrategyRegistry,
} from '../../content/rules/common-simple/scoring-capabilities';
import { evaluateHand } from '../../domain/engine/evaluation';
import {
  createCalculatorDocument,
  createHandSnapshot,
  createWinContext,
  knownContextValue,
  type CalculatorDocument,
} from '../../domain/mahjong';
import type { RulePackageDefinition } from '../../domain/rules/rule-package';
import { createCalculatorStore } from './calculator-store';

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
const document = createCalculatorDocument({
  schemaVersion: 1,
  ruleRef: { ruleId: 'common-simple', ruleVersion: '1.0.0' },
  hand,
  context: createWinContext('discard', {
    seatWind: knownContextValue('south'),
    roundWind: knownContextValue('west'),
  }),
});
const evaluator = vi.fn((currentDocument: CalculatorDocument, rule: RulePackageDefinition) =>
  evaluateHand({
    hand: currentDocument.hand,
    context: currentDocument.context,
    rule,
    patternRecognizers: commonSimplePatternRecognizerRegistry,
    scoringStrategies: commonSimpleScoringStrategyRegistry,
    extraScoringCalculators: commonSimpleExtraScoringCalculatorRegistry,
  }),
);

function storeWith(initial = document) {
  return createCalculatorStore(commonSimpleRulePackage, initial, evaluator, {
    scoringStrategies: commonSimpleScoringStrategyRegistry,
    extraScoringCalculators: commonSimpleExtraScoringCalculatorRegistry,
  });
}

describe('Calculator Store Batch 15', () => {
  it('runs preset and EffectiveRule through the complete evaluator and can change legality', async () => {
    evaluator.mockClear();
    const store = storeWith();
    expect(store.getState().applyTemporaryRuleAdjustment({ minimumFan: 1_000 })).toEqual({
      accepted: true,
    });
    await expect(store.getState().startAnalysis()).resolves.toEqual({ accepted: true });
    expect(evaluator).toHaveBeenCalledTimes(2);
    expect(store.getState().layeredEvaluation?.preset.status).toBe('legal-win');
    expect(store.getState().layeredEvaluation?.sessionRule?.evaluation.status).toBe(
      'structural-win-but-illegal',
    );
    expect(store.getState().analysisResult?.status).toBe('structural-win-but-illegal');
    expect(store.getState().activeEvaluationLayer).toBe('session-rule');
    expect(store.getState().setActiveEvaluationLayer('preset')).toBe(true);
    expect(store.getState().analysisResult?.status).toBe('legal-win');
  });

  it('creates a user layer while keeping the base legality unchanged', async () => {
    const store = storeWith();
    await store.getState().startAnalysis();
    const base = store.getState().layeredEvaluation!.preset;
    const patternId = base.candidates[0]!.relation.counted[0]!.candidate.patternId;
    expect(store.getState().applyFanAdjustment(patternId, 'exclude')).toEqual({ accepted: true });
    expect(store.getState().activeEvaluationLayer).toBe('user-adjustment');
    expect(store.getState().layeredEvaluation?.userAdjustment?.result.baseLegality).toBe(
      base.candidates[0]!.legality,
    );
    expect(store.getState().document.fanAdjustments).toEqual([{ patternId, action: 'exclude' }]);
    expect(store.getState().clearFanAdjustment(patternId)).toBe(true);
    expect(store.getState().document.fanAdjustments).toEqual([]);
  });

  it('preserves stale adjustment facts after a fresh analysis but does not apply them', async () => {
    const staleDocument = createCalculatorDocument({
      ...document,
      fanAdjustments: [{ patternId: 'not-recognized', action: 'exclude' }],
    });
    const store = storeWith(staleDocument);
    await store.getState().startAnalysis();
    const user = store.getState().layeredEvaluation?.userAdjustment;
    expect(user?.adjustments).toEqual([{ patternId: 'not-recognized', action: 'exclude' }]);
    expect(user?.result.adjustmentStates[0]).toMatchObject({
      status: 'stale',
      reasonCode: 'PATTERN_NOT_RECOGNIZED',
    });
    expect(store.getState().document.fanAdjustments).toHaveLength(1);
  });
});
