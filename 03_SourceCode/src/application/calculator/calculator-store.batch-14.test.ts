import { describe, expect, it } from 'vitest';

import { commonSimpleRulePackage } from '../../content/rules/common-simple/parsed-rule-package';
import type { SystemEvaluation } from '../../domain/engine/evaluation';
import {
  createCalculatorDocument,
  createHandSnapshot,
  createWinContext,
  knownContextValue,
} from '../../domain/mahjong';
import { createCalculatorStore } from './calculator-store';

const document = createCalculatorDocument({
  schemaVersion: 1,
  ruleRef: { ruleId: 'common-simple', ruleVersion: '1.0.0' },
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

const tiedResult: SystemEvaluation = Object.freeze({
  status: 'legal-win',
  ruleRef: document.ruleRef,
  candidates: Object.freeze([]),
  highestLegalCandidateIds: Object.freeze(['candidate-a', 'candidate-b']),
  selectedCandidateId: 'candidate-a',
});

describe('Calculator Store Batch 14', () => {
  it('retains and switches only declared tied-highest candidate ids', async () => {
    const store = createCalculatorStore(commonSimpleRulePackage, document, () => tiedResult);
    await store.getState().startAnalysis();
    expect(store.getState().selectedAnalysisCandidateId).toBe('candidate-a');
    expect(store.getState().selectAnalysisCandidate('candidate-b')).toBe(true);
    expect(store.getState().selectedAnalysisCandidateId).toBe('candidate-b');
    expect(store.getState().selectAnalysisCandidate('candidate-c')).toBe(false);
    expect(store.getState().selectedAnalysisCandidateId).toBe('candidate-b');
  });

  it('stores only a validated current-example adjustment and restores the preset', () => {
    const store = createCalculatorStore(commonSimpleRulePackage, document);
    expect(store.getState().applyTemporaryRuleAdjustment({ minimumFan: 8 })).toEqual({
      accepted: true,
    });
    expect(store.getState().document.temporaryRuleAdjustment).toEqual({
      baseRuleRef: { ruleId: 'common-simple', ruleVersion: '1.0.0' },
      values: { minimumFan: 8 },
    });
    expect(commonSimpleRulePackage.legality.minimumFan).toBe(0);

    expect(store.getState().applyTemporaryRuleAdjustment({ hiddenSwitch: true })).toEqual({
      accepted: false,
      reasonCode: 'TEMPORARY_ADJUSTMENT_INVALID',
    });
    expect(store.getState().document.temporaryRuleAdjustment?.values).toEqual({ minimumFan: 8 });
    expect(store.getState().restoreSystemPreset()).toBe(true);
    expect(store.getState().document.temporaryRuleAdjustment).toBeNull();
  });
});
