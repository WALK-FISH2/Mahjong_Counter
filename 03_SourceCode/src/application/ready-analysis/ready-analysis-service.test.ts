import { describe, expect, it } from 'vitest';

import {
  commonSimpleExtraScoringCalculatorRegistry,
  commonSimpleScoringStrategyRegistry,
} from '../../content/rules/common-simple/scoring-capabilities';
import { commonSimplePatternRecognizerRegistry } from '../../content/rules/common-simple/pattern-recognizers';
import { commonSimpleRulePackage } from '../../content/rules/common-simple/parsed-rule-package';
import {
  createCalculatorDocument,
  createHandSnapshot,
  createWinContext,
  knownContextValue,
} from '../../domain/mahjong';
import {
  EngineWorkerClient,
  type EngineWorkerPort,
  type WorkerMessageEvent,
} from '../engine-worker';
import { EngineWorkerRuntime } from '../../infrastructure/engine-worker';
import { createReadyAnalysisService } from './ready-analysis-service';

const readyHand = createHandSnapshot({
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
});

function documentFor(hand = readyHand) {
  return createCalculatorDocument({
    schemaVersion: 1,
    ruleRef: commonSimpleRulePackage.manifest,
    hand,
    context: createWinContext('discard', {
      seatWind: knownContextValue('south'),
      roundWind: knownContextValue('west'),
      robbingAddedKong: knownContextValue(true),
    }),
  });
}

class LoopbackWorkerPort implements EngineWorkerPort {
  readonly #runtime = new EngineWorkerRuntime({
    patternRecognizers: commonSimplePatternRecognizerRegistry,
    scoringStrategies: commonSimpleScoringStrategyRegistry,
    extraScoringCalculators: commonSimpleExtraScoringCalculatorRegistry,
  });
  #listener: ((event: WorkerMessageEvent) => void) | undefined;

  postMessage(request: Parameters<EngineWorkerPort['postMessage']>[0]): void {
    const response = this.#runtime.execute(request);
    queueMicrotask(() => this.#listener?.({ data: response }));
  }
  addEventListener(_type: 'message', listener: (event: WorkerMessageEvent) => void): void {
    this.#listener = listener;
  }
  removeEventListener(_type: 'message', listener: (event: WorkerMessageEvent) => void): void {
    if (this.#listener === listener) this.#listener = undefined;
  }
  terminate(): void {
    this.#listener = undefined;
  }
}

describe('ReadyAnalysisService', () => {
  it('selects the operation from rule-defined counts and keeps both win modes separate', async () => {
    const document = documentFor();
    const service = createReadyAnalysisService({
      client: new EngineWorkerClient(() => new LoopbackWorkerPort()),
      engineVersion: 'test-engine',
      getCurrentDocumentRevision: () => document.revision,
    });

    expect(service.getKind(document, commonSimpleRulePackage)).toBe('wait-analysis');
    const result = await service.analyze(document, commonSimpleRulePackage);

    expect(result).toMatchObject({
      kind: 'wait-analysis',
      primaryMode: 'discard',
      alternateMode: 'self-draw',
      documentRevision: document.revision,
    });
    if (result.kind !== 'wait-analysis') throw new Error('Expected wait analysis.');
    expect(result.primary.candidates).toContainEqual(
      expect.objectContaining({ tile: 'white', status: 'legal' }),
    );
    expect(result.alternate.candidates).toContainEqual(
      expect.objectContaining({ tile: 'white', status: 'legal' }),
    );
    expect(document.context.values.robbingAddedKong).toEqual(knownContextValue(true));
  });

  it('uses discard analysis at the target count and rejects transient input', async () => {
    const fullDocument = documentFor(
      createHandSnapshot({ concealed: [...readyHand.concealed, 'm9'] }),
    );
    const service = createReadyAnalysisService({
      client: new EngineWorkerClient(() => new LoopbackWorkerPort()),
      engineVersion: 'test-engine',
      getCurrentDocumentRevision: () => fullDocument.revision,
    });
    expect(service.getKind(fullDocument, commonSimpleRulePackage)).toBe('discard-to-ready');
    const result = await service.analyze(fullDocument, commonSimpleRulePackage);
    expect(result.kind).toBe('discard-to-ready');

    const transientDocument = createCalculatorDocument({
      ...fullDocument,
      transientInput: { kind: 'pung' },
    });
    expect(service.getKind(transientDocument, commonSimpleRulePackage)).toBeNull();
  });
});
