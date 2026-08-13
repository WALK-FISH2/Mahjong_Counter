import {
  ENGINE_WORKER_PROTOCOL_VERSION,
  type DiscardToReadyWorkerSuccess,
  type EngineWorkerFailure,
  type EngineWorkerRequest,
  type EngineWorkerResponse,
  type EngineWorkerSuccess,
  type EvaluateWorkerSuccess,
  type WaitAnalysisWorkerSuccess,
} from '../../application/engine-worker/engine-worker-protocol';
import {
  analyzeWaits,
  type ReadyAnalysisCapabilities,
} from '../../domain/engine/ready-analysis/wait-analysis';
import { analyzeDiscardToReady } from '../../domain/engine/ready-analysis/discard-to-ready';
import { evaluateHand } from '../../domain/engine/evaluation/evaluate-hand';
import { createEngineCacheKey } from './engine-cache-key';
import { SessionLruCache } from './session-lru-cache';

export type EngineWorkerRuntimeStats = Readonly<{
  executions: number;
  cacheHits: number;
}>;

function successBase(request: EngineWorkerRequest) {
  return {
    protocolVersion: ENGINE_WORKER_PROTOCOL_VERSION,
    engineVersion: request.engineVersion,
    requestId: request.requestId,
    documentRevision: request.documentRevision,
    operation: request.operation,
    status: 'success' as const,
  };
}

export class EngineWorkerRuntime {
  readonly #capabilities: ReadyAnalysisCapabilities;
  readonly #cache: SessionLruCache<EngineWorkerSuccess['result']>;
  #executions = 0;
  #cacheHits = 0;

  constructor(capabilities: ReadyAnalysisCapabilities, cacheCapacity = 128) {
    this.#capabilities = capabilities;
    this.#cache = new SessionLruCache(cacheCapacity);
  }

  execute(request: EngineWorkerRequest): EngineWorkerResponse {
    if (
      request.protocolVersion !== ENGINE_WORKER_PROTOCOL_VERSION ||
      request.documentRevision !== request.document.revision
    ) {
      return this.#failure(request, 'INVALID_REQUEST', 'Worker request metadata is inconsistent.');
    }

    try {
      const cacheKey = createEngineCacheKey(request);
      const cached = this.#cache.get(cacheKey);
      if (cached !== undefined) {
        this.#cacheHits += 1;
        return this.#success(request, cached);
      }

      this.#executions += 1;
      const result = this.#calculate(request);
      this.#cache.set(cacheKey, result);
      return this.#success(request, result);
    } catch (error) {
      return this.#failure(
        request,
        'ENGINE_EXECUTION_FAILED',
        error instanceof Error ? error.message : 'Unknown engine execution failure.',
      );
    }
  }

  getStats(): EngineWorkerRuntimeStats {
    return Object.freeze({ executions: this.#executions, cacheHits: this.#cacheHits });
  }

  #calculate(request: EngineWorkerRequest): EngineWorkerSuccess['result'] {
    switch (request.operation) {
      case 'evaluate':
        return evaluateHand({
          hand: request.document.hand,
          context: request.document.context,
          rule: request.rule,
          patternRecognizers: this.#capabilities.patternRecognizers,
          scoringStrategies: this.#capabilities.scoringStrategies,
          extraScoringCalculators: this.#capabilities.extraScoringCalculators,
        });
      case 'wait-analysis':
        return analyzeWaits({
          hand: request.document.hand,
          context: request.document.context,
          rule: request.rule,
          capabilities: this.#capabilities,
        });
      case 'discard-to-ready':
        return analyzeDiscardToReady({
          hand: request.document.hand,
          context: request.document.context,
          rule: request.rule,
          capabilities: this.#capabilities,
        });
    }
  }

  #success(
    request: EngineWorkerRequest,
    result: EngineWorkerSuccess['result'],
  ): EngineWorkerSuccess {
    switch (request.operation) {
      case 'evaluate':
        return Object.freeze({
          ...successBase(request),
          operation: request.operation,
          result,
        }) as EvaluateWorkerSuccess;
      case 'wait-analysis':
        return Object.freeze({
          ...successBase(request),
          operation: request.operation,
          result,
        }) as WaitAnalysisWorkerSuccess;
      case 'discard-to-ready':
        return Object.freeze({
          ...successBase(request),
          operation: request.operation,
          result,
        }) as DiscardToReadyWorkerSuccess;
    }
  }

  #failure(
    request: EngineWorkerRequest,
    code: EngineWorkerFailure['error']['code'],
    message: string,
  ): EngineWorkerFailure {
    return Object.freeze({
      protocolVersion: ENGINE_WORKER_PROTOCOL_VERSION,
      engineVersion: request.engineVersion,
      requestId: request.requestId,
      documentRevision: request.documentRevision,
      operation: request.operation,
      status: 'error',
      error: Object.freeze({ code, message }),
    });
  }
}
