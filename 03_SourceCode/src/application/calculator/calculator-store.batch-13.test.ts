import { describe, expect, it, vi } from 'vitest';

import { commonSimpleRulePackage } from '../../content/rules/common-simple/parsed-rule-package';
import {
  createCalculatorDocument,
  createHandSnapshot,
  createOpenKongMeld,
  createWinContext,
  knownContextValue,
} from '../../domain/mahjong';
import type { SystemEvaluation } from '../../domain/engine/evaluation';
import { isContextDefinitionApplicable } from '../../domain/engine/legality';
import {
  createCalculatorStore,
  getCalculatorStatus,
  getCorrectionIssues,
} from './calculator-store';

const COMPLETE_HAND = createHandSnapshot({
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

function completeContext(mode: 'discard' | 'self-draw' = 'discard') {
  return createWinContext(mode, {
    seatWind: knownContextValue('east'),
    roundWind: knownContextValue('south'),
  });
}

function documentWith(hand = COMPLETE_HAND, context = completeContext()) {
  return createCalculatorDocument({
    schemaVersion: 1,
    ruleRef: { ruleId: 'common-simple', ruleVersion: '1.0.0' },
    hand,
    context,
  });
}

const COMPLETED_RESULT: SystemEvaluation = Object.freeze({
  status: 'incomplete-context',
  ruleRef: Object.freeze({ ruleId: 'common-simple', ruleVersion: '1.0.0' }),
  candidates: Object.freeze([]),
  highestLegalCandidateIds: Object.freeze([]),
  selectedCandidateId: null,
});

describe('Calculator Store Batch 13', () => {
  it('uses RulePackage applicability and clears incompatible context with a full undo', () => {
    const context = createWinContext('self-draw', {
      seatWind: knownContextValue('east'),
      roundWind: knownContextValue('south'),
      afterKongReplacement: knownContextValue(true),
    });
    const store = createCalculatorStore(
      commonSimpleRulePackage,
      documentWith(COMPLETE_HAND, context),
    );
    const afterKong = commonSimpleRulePackage.contexts.find(
      ({ contextId }) => contextId === 'afterKongReplacement',
    )!;

    expect(isContextDefinitionApplicable(afterKong, context)).toBe(true);
    expect(
      isContextDefinitionApplicable(afterKong, createWinContext('discard', context.values)),
    ).toBe(false);

    expect(store.getState().setContextMode('discard')).toEqual([
      { contextId: 'afterKongReplacement', previousValue: true },
    ]);
    expect(store.getState().document.context).toMatchObject({
      mode: 'discard',
      values: { seatWind: { value: 'east' }, roundWind: { value: 'south' } },
    });
    expect(store.getState().document.context.values.afterKongReplacement).toBeUndefined();

    expect(store.getState().undoContextRemovals()).toBe(true);
    expect(store.getState().document.context).toEqual(context);
  });

  it('enforces data-defined context values and mutual exclusion without a ruleId branch', () => {
    const contexts = commonSimpleRulePackage.contexts.map((definition) =>
      definition.contextId === 'lastTile'
        ? { ...definition, mutuallyExclusiveWith: ['robbingAddedKong'] }
        : definition.contextId === 'robbingAddedKong'
          ? { ...definition, mutuallyExclusiveWith: ['lastTile'] }
          : definition,
    );
    const rule = { ...commonSimpleRulePackage, contexts };
    const store = createCalculatorStore(rule, documentWith());

    expect(store.getState().updateContextValue('lastTile', true)).toEqual({ accepted: true });
    expect(store.getState().updateContextValue('robbingAddedKong', true)).toEqual({
      accepted: true,
    });
    expect(store.getState().document.context.values.lastTile).toBeUndefined();
    expect(store.getState().document.context.values.robbingAddedKong).toEqual({
      status: 'known',
      value: true,
    });
    expect(store.getState().clearContextValue('robbingAddedKong')).toBe(true);
    expect(store.getState().document.context.values.robbingAddedKong).toBeUndefined();
    expect(store.getState().updateContextValue('seatWind', 'invalid-wind')).toEqual({
      accepted: false,
      reasonCode: 'CONTEXT_VALUE_INVALID',
    });
  });

  it('does not clear a mutually exclusive peer when recording boolean false', () => {
    const contexts = commonSimpleRulePackage.contexts.map((definition) =>
      definition.contextId === 'lastTile'
        ? { ...definition, mutuallyExclusiveWith: ['robbingAddedKong'] }
        : definition.contextId === 'robbingAddedKong'
          ? { ...definition, mutuallyExclusiveWith: ['lastTile'] }
          : definition,
    );
    const rule = { ...commonSimpleRulePackage, contexts };
    const store = createCalculatorStore(rule, documentWith());

    store.getState().updateContextValue('lastTile', true);
    store.getState().updateContextValue('robbingAddedKong', false);

    expect(store.getState().document.context.values.lastTile).toEqual({
      status: 'known',
      value: true,
    });
  });

  it('reports missing required context and prevents formal analysis', async () => {
    const evaluator = vi.fn(() => COMPLETED_RESULT);
    const store = createCalculatorStore(
      commonSimpleRulePackage,
      documentWith(COMPLETE_HAND, createWinContext('discard')),
      evaluator,
    );
    const status = getCalculatorStatus(store.getState());

    expect([...status.missingContextIds].sort()).toEqual(['roundWind', 'seatWind']);
    expect(status.formalActionsAllowed).toBe(false);
    expect(status.canAnalyze).toBe(false);
    await expect(store.getState().startAnalysis()).resolves.toEqual({
      accepted: false,
      reasonCode: 'ANALYSIS_NOT_READY',
    });
    expect(evaluator).not.toHaveBeenCalled();
  });

  it('separates rule-driven structural count from physical count for kongs and flowers', () => {
    const hand = createHandSnapshot({
      concealed: ['m1', 'm2', 'm3', 'p1', 'p2', 'p3', 's1', 's2', 's3', 'east'],
      melds: [createOpenKongMeld('kong-white', 'white', 'direct')],
      flowers: ['spring'],
      winningTile: 'east',
    });
    const store = createCalculatorStore(commonSimpleRulePackage, documentWith(hand));
    const status = getCalculatorStatus(store.getState());

    expect(status).toMatchObject({
      structuralTileCount: 14,
      physicalTileCount: 16,
      targetStructuralTileCount: 14,
    });
  });

  it('moves through ready, analyzing, result, and cancellable analysis states', async () => {
    let resolveEvaluation!: (result: SystemEvaluation) => void;
    const evaluator = () =>
      new Promise<SystemEvaluation>((resolve) => {
        resolveEvaluation = resolve;
      });
    const store = createCalculatorStore(commonSimpleRulePackage, documentWith(), evaluator);

    expect(getCalculatorStatus(store.getState()).phase).toBe('ready');
    const pending = store.getState().startAnalysis();
    expect(getCalculatorStatus(store.getState()).phase).toBe('analyzing');
    expect(store.getState().cancelAnalysis()).toBe(true);
    resolveEvaluation(COMPLETED_RESULT);
    await expect(pending).resolves.toEqual({ accepted: true });
    expect(getCalculatorStatus(store.getState()).phase).toBe('ready');

    const completed = store.getState().startAnalysis();
    resolveEvaluation(COMPLETED_RESULT);
    await completed;
    expect(getCalculatorStatus(store.getState()).phase).toBe('result');
  });

  it('preserves correction input until explicit clear and keeps the clear recoverable', () => {
    const invalidHand = createHandSnapshot({
      concealed: ['m1', 'm1', 'm1', 'm1', 'm1'],
    });
    const store = createCalculatorStore(commonSimpleRulePackage, documentWith(invalidHand));
    const issues = getCorrectionIssues(store.getState().document, commonSimpleRulePackage);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.issue).toMatchObject({ reasonCode: 'TILE_COPY_LIMIT_EXCEEDED' });
    expect(store.getState().document.hand.concealed).toHaveLength(5);
    expect(getCalculatorStatus(store.getState()).formalActionsAllowed).toBe(false);

    expect(store.getState().clearCorrectionIssue(issues[0]!.issueId)).toBe(true);
    expect(store.getState().document.hand.concealed).toHaveLength(4);
    expect(getCorrectionIssues(store.getState().document, commonSimpleRulePackage)).toEqual([]);
    expect(store.getState().undoLastHandChange()).toBe(true);
    expect(store.getState().document.hand.concealed).toHaveLength(5);
  });
});
