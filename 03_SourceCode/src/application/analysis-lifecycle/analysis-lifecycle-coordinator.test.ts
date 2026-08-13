import { afterEach, describe, expect, it, vi } from 'vitest';

import { commonSimpleRulePackage } from '../../content/rules/common-simple/parsed-rule-package';
import { commonSimplePatternRecognizerRegistry } from '../../content/rules/common-simple/pattern-recognizers';
import {
  commonSimpleExtraScoringCalculatorRegistry,
  commonSimpleScoringStrategyRegistry,
} from '../../content/rules/common-simple/scoring-capabilities';
import { evaluateHand, type SystemEvaluation } from '../../domain/engine/evaluation';
import {
  createCalculatorDocument,
  createHandSnapshot,
  createWinContext,
  knownContextValue,
  type CalculatorDocument,
} from '../../domain/mahjong';
import type { RulePackageDefinition } from '../../domain/rules/rule-package';
import { createCalculatorStore } from '../calculator/calculator-store';
import { createAnalysisLifecycleCoordinator } from './analysis-lifecycle-coordinator';

const RESULT: SystemEvaluation = Object.freeze({
  status: 'legal-win',
  ruleRef: Object.freeze({ ruleId: 'common-simple', ruleVersion: '1.0.0' }),
  candidates: Object.freeze([]),
  highestLegalCandidateIds: Object.freeze([]),
  selectedCandidateId: null,
});

function completeDocument() {
  return createCalculatorDocument({
    schemaVersion: 1,
    ruleRef: commonSimpleRulePackage.manifest,
    hand: createHandSnapshot({
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
    }),
    context: createWinContext('discard', {
      seatWind: knownContextValue('east'),
      roundWind: knownContextValue('south'),
    }),
  });
}

afterEach(() => vi.useRealTimers());

describe('AnalysisLifecycleCoordinator', () => {
  it('debounces rapid relevant edits only after a first formal result', async () => {
    vi.useFakeTimers();
    const evaluator = vi.fn(() => RESULT);
    const store = createCalculatorStore(commonSimpleRulePackage, completeDocument(), evaluator);
    const runAnalysis = vi.fn(() => store.getState().startAnalysis());
    const coordinator = createAnalysisLifecycleCoordinator({
      store,
      runAnalysis,
      debounceMs: 250,
    });

    store.getState().setWinningTile('green');
    await vi.advanceTimersByTimeAsync(300);
    expect(runAnalysis).not.toHaveBeenCalled();

    store.getState().setWinningTile('white');
    await store.getState().startAnalysis();
    expect(coordinator.isAutomaticRecalculationEnabled()).toBe(true);
    expect(store.getState().analysisResult).toBe(RESULT);

    store.getState().setWinningTile('green');
    store.getState().setContextMode('self-draw');
    store.getState().applyTemporaryRuleAdjustment({ minimumFan: 1 });
    expect(store.getState().analysisResult).toBeNull();

    await vi.advanceTimersByTimeAsync(249);
    expect(runAnalysis).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(runAnalysis).toHaveBeenCalledTimes(1);
    expect(store.getState().analysisResult).toBe(RESULT);
    coordinator.dispose();
  });

  it('cannot publish a stale response after a newer revision is scheduled', async () => {
    vi.useFakeTimers();
    const resolvers: Array<(result: SystemEvaluation) => void> = [];
    const evaluator = vi.fn(
      () =>
        new Promise<SystemEvaluation>((resolve) => {
          resolvers.push(resolve);
        }),
    );
    const store = createCalculatorStore(commonSimpleRulePackage, completeDocument(), evaluator);
    const initial = store.getState().startAnalysis();
    resolvers.shift()!(RESULT);
    await initial;

    const runAnalysis = vi.fn(() => store.getState().startAnalysis());
    const coordinator = createAnalysisLifecycleCoordinator({ store, runAnalysis, debounceMs: 10 });
    store.getState().setWinningTile('green');
    await vi.advanceTimersByTimeAsync(10);
    expect(runAnalysis).toHaveBeenCalledTimes(1);
    const staleResolver = resolvers.shift()!;

    store.getState().setWinningTile('red');
    expect(store.getState().analysisResult).toBeNull();
    staleResolver(RESULT);
    await Promise.resolve();
    expect(store.getState().analysisResult).toBeNull();

    await vi.advanceTimersByTimeAsync(10);
    const currentResolver = resolvers.shift()!;
    currentResolver(RESULT);
    await Promise.resolve();
    expect(store.getState().analysisResult).toBe(RESULT);
    expect(runAnalysis).toHaveBeenCalledTimes(2);
    coordinator.dispose();
  });

  it('invalidates and fully recalculates after a fan adjustment', async () => {
    vi.useFakeTimers();
    const evaluator = vi.fn((document: CalculatorDocument, rule: RulePackageDefinition) =>
      evaluateHand({
        hand: document.hand,
        context: document.context,
        rule,
        patternRecognizers: commonSimplePatternRecognizerRegistry,
        scoringStrategies: commonSimpleScoringStrategyRegistry,
        extraScoringCalculators: commonSimpleExtraScoringCalculatorRegistry,
      }),
    );
    const store = createCalculatorStore(commonSimpleRulePackage, completeDocument(), evaluator, {
      scoringStrategies: commonSimpleScoringStrategyRegistry,
      extraScoringCalculators: commonSimpleExtraScoringCalculatorRegistry,
    });
    await store.getState().startAnalysis();
    const patternId =
      store.getState().analysisResult?.candidates[0]?.relation.counted[0]?.candidate.patternId;
    if (patternId === undefined) throw new Error('Expected a counted pattern fixture.');
    const runAnalysis = vi.fn(() => store.getState().startAnalysis());
    const coordinator = createAnalysisLifecycleCoordinator({ store, runAnalysis, debounceMs: 25 });

    expect(store.getState().applyFanAdjustment(patternId, 'exclude')).toEqual({ accepted: true });
    expect(store.getState().analysisResult).toBeNull();
    await vi.advanceTimersByTimeAsync(25);
    expect(runAnalysis).toHaveBeenCalledOnce();
    expect(store.getState().analysisResult).not.toBeNull();
    expect(store.getState().document.fanAdjustments).toEqual([{ patternId, action: 'exclude' }]);
    coordinator.dispose();
  });
});
