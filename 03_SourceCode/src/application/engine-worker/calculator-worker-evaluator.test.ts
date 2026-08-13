import { describe, expect, it, vi } from 'vitest';

import { commonSimpleRulePackage } from '../../content/rules/common-simple/parsed-rule-package';
import {
  createCalculatorDocument,
  createHandSnapshot,
  createWinContext,
  knownContextValue,
} from '../../domain/mahjong';
import { createCalculatorStore } from '../calculator/calculator-store';
import { createWorkerCalculatorEvaluator } from './calculator-worker-evaluator';
import {
  EngineWorkerClient,
  type EngineWorkerPort,
  type WorkerMessageEvent,
} from './engine-worker-client';

class PendingWorkerPort implements EngineWorkerPort {
  readonly terminate = vi.fn();
  #listener: ((event: WorkerMessageEvent) => void) | undefined;

  postMessage(): void {}
  addEventListener(_type: 'message', listener: (event: WorkerMessageEvent) => void): void {
    this.#listener = listener;
  }
  removeEventListener(_type: 'message', listener: (event: WorkerMessageEvent) => void): void {
    if (this.#listener === listener) this.#listener = undefined;
  }
}

describe('Calculator Worker evaluator', () => {
  it('cancels store analysis by terminating the active worker without publishing a result', async () => {
    const firstPort = new PendingWorkerPort();
    const ports = [firstPort, new PendingWorkerPort()];
    const client = new EngineWorkerClient(() => ports.shift()!);
    let currentRevision = 0;
    const evaluator = createWorkerCalculatorEvaluator({
      client,
      engineVersion: 'test-engine',
      getCurrentDocumentRevision: () => currentRevision,
    });
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
        seatWind: knownContextValue('south'),
        roundWind: knownContextValue('west'),
      }),
    });
    currentRevision = document.revision;
    const store = createCalculatorStore(commonSimpleRulePackage, document, evaluator);

    const pending = store.getState().startAnalysis();
    expect(store.getState().analysisStatus).toBe('analyzing');
    expect(store.getState().cancelAnalysis()).toBe(true);
    await pending;

    expect(firstPort.terminate).toHaveBeenCalledOnce();
    expect(store.getState()).toMatchObject({ analysisStatus: 'idle', analysisResult: null });
  });
});
