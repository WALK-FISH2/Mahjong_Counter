/// <reference lib="webworker" />

import type { EngineWorkerRequest } from '../../application/engine-worker/engine-worker-protocol';
import { commonSimplePatternRecognizerRegistry } from '../../content/rules/common-simple/pattern-recognizers';
import {
  commonSimpleExtraScoringCalculatorRegistry,
  commonSimpleScoringStrategyRegistry,
} from '../../content/rules/common-simple/scoring-capabilities';
import { EngineWorkerRuntime } from './engine-worker-runtime';

const workerScope = self as unknown as DedicatedWorkerGlobalScope;
const runtime = new EngineWorkerRuntime(
  Object.freeze({
    patternRecognizers: commonSimplePatternRecognizerRegistry,
    scoringStrategies: commonSimpleScoringStrategyRegistry,
    extraScoringCalculators: commonSimpleExtraScoringCalculatorRegistry,
  }),
);

workerScope.addEventListener('message', (event: MessageEvent<EngineWorkerRequest>) => {
  workerScope.postMessage(runtime.execute(event.data));
});

export {};
