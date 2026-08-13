import { describe, expect, it, vi } from 'vitest';

import { commonSimpleRulePackage } from '../../content/rules/common-simple/parsed-rule-package';
import type { SystemEvaluation } from '../../domain/engine/evaluation';
import {
  createCalculatorDocument,
  createHandSnapshot,
  createWinContext,
  knownContextValue,
} from '../../domain/mahjong';
import { createCalculatorStore } from '../calculator/calculator-store';
import {
  createCalculatorUndoPort,
  createEngineErrorRecoveryService,
} from './engine-error-recovery';

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

describe('EngineErrorRecoveryService', () => {
  it('protects the Draft, emits no guessed result, retries, undoes, and copies safe info', async () => {
    const evaluator = vi
      .fn()
      .mockRejectedValueOnce(new Error('private hand m1'))
      .mockReturnValue(RESULT);
    const store = createCalculatorStore(commonSimpleRulePackage, completeDocument(), evaluator);
    const protectCurrentDraft = vi.fn().mockResolvedValue(undefined);
    const undo = vi.fn(() => true);
    const writeText = vi.fn().mockResolvedValue(undefined);
    const service = createEngineErrorRecoveryService({
      store,
      draftProtectionPort: { protectCurrentDraft },
      undoPort: { undo },
      clipboardPort: { writeText },
      appVersion: '0.1.0',
      engineVersion: '0.2.0',
    });

    await expect(service.runAnalysis()).resolves.toEqual({
      accepted: false,
      reasonCode: 'ANALYSIS_FAILED',
    });
    expect(store.getState().analysisResult).toBeNull();
    expect(protectCurrentDraft).toHaveBeenCalledWith(store.getState().document);
    expect(service.getState()).toMatchObject({ status: 'error', draftProtected: true });
    expect(service.getState().issueInfo).not.toContain('private hand');
    expect(service.getState().issueInfo).not.toContain('m1');

    await expect(service.copyIssueInfo()).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('errorCode=ENGINE_ANALYSIS_FAILED'),
    );
    expect(service.getState().copyStatus).toBe('copied');

    await expect(service.retry()).resolves.toEqual({ accepted: true });
    expect(store.getState().analysisResult).toBe(RESULT);
    expect(service.getState().status).toBe('idle');

    expect(service.undo()).toBe(true);
    expect(undo).toHaveBeenCalledOnce();
  });

  it('keeps recovery available after retry and clipboard failures', async () => {
    const store = createCalculatorStore(commonSimpleRulePackage, completeDocument(), () => {
      throw new Error('still failing');
    });
    const service = createEngineErrorRecoveryService({
      store,
      draftProtectionPort: { protectCurrentDraft: vi.fn().mockRejectedValue(new Error('full')) },
      undoPort: { undo: () => false },
      clipboardPort: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      appVersion: '0.1.0',
      engineVersion: '0.2.0',
    });

    await service.runAnalysis();
    await expect(service.retry()).resolves.toMatchObject({ reasonCode: 'ANALYSIS_FAILED' });
    expect(service.getState()).toMatchObject({ status: 'error', draftProtected: false });
    await expect(service.copyIssueInfo()).resolves.toBe(false);
    expect(service.getState().copyStatus).toBe('manual-copy');
    expect(service.undo()).toBe(false);
  });

  it('restores the previous CalculatorDocument through the concrete UndoPort', () => {
    const store = createCalculatorStore(commonSimpleRulePackage, completeDocument());
    const undoPort = createCalculatorUndoPort(store);
    const originalRevision = store.getState().document.revision;
    store.getState().setWinningTile('green');

    expect(store.getState().document.hand.winningTile).toBe('green');
    expect(undoPort.undo()).toBe(true);
    expect(store.getState().document.hand.winningTile).toBe('white');
    expect(store.getState().document.revision).toBe(originalRevision + 2);
    expect(undoPort.undo()).toBe(false);
  });
});
