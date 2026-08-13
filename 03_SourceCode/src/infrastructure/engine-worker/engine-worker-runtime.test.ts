import { describe, expect, it } from 'vitest';

import { createEngineWorkerRequest } from '../../application/engine-worker/engine-worker-protocol';
import { commonSimplePatternRecognizerRegistry } from '../../content/rules/common-simple/pattern-recognizers';
import {
  commonSimpleExtraScoringCalculatorRegistry,
  commonSimpleScoringStrategyRegistry,
} from '../../content/rules/common-simple/scoring-capabilities';
import { commonSimpleRulePackage } from '../../content/rules/common-simple/parsed-rule-package';
import {
  createCalculatorDocument,
  createHandSnapshot,
  createWinContext,
  knownContextValue,
} from '../../domain/mahjong';
import { EngineWorkerRuntime } from './engine-worker-runtime';

const capabilities = Object.freeze({
  patternRecognizers: commonSimplePatternRecognizerRegistry,
  scoringStrategies: commonSimpleScoringStrategyRegistry,
  extraScoringCalculators: commonSimpleExtraScoringCalculatorRegistry,
});
const completeContext = createWinContext('discard', {
  seatWind: knownContextValue('south'),
  roundWind: knownContextValue('west'),
});
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

function request(
  operation: 'evaluate' | 'wait-analysis' | 'discard-to-ready',
  hand = readyHand,
  engineVersion = 'engine-a',
  rule = commonSimpleRulePackage,
) {
  const document = createCalculatorDocument({
    schemaVersion: 1,
    ruleRef: { ruleId: rule.manifest.ruleId, ruleVersion: rule.manifest.ruleVersion },
    hand,
    context: completeContext,
  });
  return createEngineWorkerRequest({
    engineVersion,
    requestId: `${operation}-${engineVersion}`,
    operation,
    document,
    rule,
  });
}

describe('Engine Worker runtime', () => {
  it('executes evaluate, wait, and discard operations with the shared formal engine', () => {
    const runtime = new EngineWorkerRuntime(capabilities);
    const winningHand = createHandSnapshot({ ...readyHand, winningTile: 'white' });
    const fullHand = createHandSnapshot({ concealed: [...readyHand.concealed, 'm9'] });

    expect(runtime.execute(request('evaluate', winningHand))).toMatchObject({
      status: 'success',
      operation: 'evaluate',
      result: { status: 'legal-win' },
    });
    const waits = runtime.execute(request('wait-analysis'));
    expect(waits.status).toBe('success');
    expect(
      waits.status === 'success' && waits.operation === 'wait-analysis'
        ? waits.result.candidates.some(({ tile }) => tile === 'white')
        : false,
    ).toBe(true);

    const discards = runtime.execute(request('discard-to-ready', fullHand));
    expect(discards.status).toBe('success');
    expect(
      discards.status === 'success' && discards.operation === 'discard-to-ready'
        ? discards.result.candidates.some(({ discard }) => discard === 'm9')
        : false,
    ).toBe(true);
  });

  it('hits session LRU for normalized repeated hands and isolates Rule and Engine versions', () => {
    const runtime = new EngineWorkerRuntime(capabilities, 4);
    const reversed = createHandSnapshot({ concealed: [...readyHand.concealed].reverse() });
    const nextRuleVersion = Object.freeze({
      ...commonSimpleRulePackage,
      manifest: Object.freeze({
        ...commonSimpleRulePackage.manifest,
        ruleVersion: '1.0.1',
      }),
    });

    runtime.execute(request('wait-analysis', readyHand, 'engine-a'));
    runtime.execute(request('wait-analysis', reversed, 'engine-a'));
    expect(runtime.getStats()).toEqual({ executions: 1, cacheHits: 1 });

    runtime.execute(request('wait-analysis', readyHand, 'engine-b'));
    expect(runtime.getStats()).toEqual({ executions: 2, cacheHits: 1 });

    runtime.execute(request('wait-analysis', readyHand, 'engine-a', nextRuleVersion));
    expect(runtime.getStats()).toEqual({ executions: 3, cacheHits: 1 });
  });
});
