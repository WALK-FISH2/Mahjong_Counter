import { persistenceDocument, persistenceFixture } from './persistence-fixture';
import { createShareService } from '../../application/share/share-service';
import { createShareCodec } from '../../infrastructure/share/share-codec';
import { createCommonSimpleRuleRepository } from '../../infrastructure/rule-repository/common-simple-rule-repository';
import { createCalculatorReplaceGuard } from '../../application/calculator/replace-calculator';
import { createReadyAnalysisService } from '../../application/ready-analysis';
import {
  EngineWorkerClient,
  type EngineWorkerPort,
  type WorkerMessageEvent,
} from '../../application/engine-worker';
import { EngineWorkerRuntime } from '../../infrastructure/engine-worker';
import { commonSimplePatternRecognizerRegistry } from '../../content/rules/common-simple/pattern-recognizers';
import {
  commonSimpleScoringStrategyRegistry,
  commonSimpleExtraScoringCalculatorRegistry,
} from '../../content/rules/common-simple/scoring-capabilities';
import { ENGINE_VERSION } from '../../app/version';

class ShareLoopback implements EngineWorkerPort {
  readonly engine = new EngineWorkerRuntime({
    patternRecognizers: commonSimplePatternRecognizerRegistry,
    scoringStrategies: commonSimpleScoringStrategyRegistry,
    extraScoringCalculators: commonSimpleExtraScoringCalculatorRegistry,
  });
  listener: ((event: WorkerMessageEvent) => void) | undefined;
  postMessage(request: Parameters<EngineWorkerPort['postMessage']>[0]) {
    const response = this.engine.execute(request);
    queueMicrotask(() => this.listener?.({ data: response }));
  }
  addEventListener(_type: 'message', listener: (event: WorkerMessageEvent) => void) {
    this.listener = listener;
  }
  removeEventListener(_type: 'message', listener: (event: WorkerMessageEvent) => void) {
    if (this.listener === listener) this.listener = undefined;
  }
  terminate() {
    this.listener = undefined;
  }
}
export function shareFixture(document = persistenceDocument) {
  const f = persistenceFixture(document);
  const controls = { writable: true, protect: true, engineError: false, protected: 0 };
  const guard = createCalculatorReplaceGuard(
    f.store,
    {
      async protectBeforeReplacement(doc) {
        controls.protected++;
        if (!controls.protect) throw new Error('STORAGE_UNAVAILABLE');
        await f.drafts.protectBeforeReplacement(doc, 'share');
      },
    },
    () => controls.writable,
  );
  const ready = createReadyAnalysisService({
    client: new EngineWorkerClient(() => new ShareLoopback()),
    engineVersion: ENGINE_VERSION,
    getCurrentDocumentRevision: () => f.store.getState().document.revision,
  });
  const service = createShareService({
    calculator: f.store,
    codec: createShareCodec(),
    rules: createCommonSimpleRuleRepository(),
    replaceGuard: guard,
    ready,
    engineVersion: ENGINE_VERSION,
    canUseRule: () => true,
    isEngineError: () => controls.engineError,
  });
  return { ...f, service, controls, ready };
}
