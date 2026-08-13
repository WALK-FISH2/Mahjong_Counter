import {
  createCalculatorStore,
  type CalculatorStore,
} from '../../application/calculator/calculator-store';
import {
  createWorkerCalculatorEvaluator,
  EngineWorkerClient,
} from '../../application/engine-worker';
import {
  createReadyAnalysisService,
  type ReadyAnalysisService,
} from '../../application/ready-analysis';
import {
  InMemoryCalculatorDraftPort,
  createCalculatorReplaceGuard,
} from '../../application/calculator/replace-calculator';
import {
  InMemoryCalculatorPreferencesPort,
  recordRecentlyUsedRule,
} from '../../application/preferences';
import {
  commonSimpleExtraScoringCalculatorRegistry,
  commonSimpleScoringStrategyRegistry,
} from '../../content/rules/common-simple/scoring-capabilities';
import {
  createQuickCalcEvaluator,
  type QuickCalcEvaluator,
} from '../../application/calculator/quick-calc';
import { APP_VERSION, ENGINE_VERSION } from '../version';
import { createBrowserEngineWorkerPort } from '../../infrastructure/engine-worker';
import {
  COMMON_SIMPLE_RULE_REF,
  createCommonSimpleRuleRepository,
} from '../../infrastructure/rule-repository/common-simple-rule-repository';
import type { BuiltInRuleRepository } from '../../infrastructure/rule-repository/built-in-rule-repository';
import {
  createAnalysisLifecycleCoordinator,
  createCalculatorUndoPort,
  createEngineErrorRecoveryService,
  type AnalysisLifecycleCoordinator,
  type EngineErrorRecoveryService,
} from '../../application/analysis-lifecycle';
import { createBrowserClipboardPort } from '../../infrastructure/clipboard';

export type CalculatorRuntime = Readonly<{
  store: CalculatorStore;
  quickCalcEvaluator: QuickCalcEvaluator;
  ruleRepository: BuiltInRuleRepository;
  preferencesPort: InMemoryCalculatorPreferencesPort;
  replaceGuard: ReturnType<typeof createCalculatorReplaceGuard>;
  readyAnalysisService: ReadyAnalysisService;
  engineErrorRecovery: EngineErrorRecoveryService;
  analysisLifecycle: AnalysisLifecycleCoordinator;
}>;

let calculatorRuntimePromise: Promise<CalculatorRuntime> | undefined;
const preferencesPort = new InMemoryCalculatorPreferencesPort();
const draftPort = new InMemoryCalculatorDraftPort();

export function loadCalculatorRuntime(): Promise<CalculatorRuntime> {
  calculatorRuntimePromise ??= (async () => {
    const ruleRepository = createCommonSimpleRuleRepository();
    const rulePackage = await ruleRepository.getInstalledRule(COMMON_SIMPLE_RULE_REF);
    await recordRecentlyUsedRule(preferencesPort, rulePackage.manifest);
    const engineWorkerClient = new EngineWorkerClient(createBrowserEngineWorkerPort);
    const storeRef: { current: CalculatorStore | undefined } = { current: undefined };
    const evaluator = createWorkerCalculatorEvaluator({
      client: engineWorkerClient,
      engineVersion: ENGINE_VERSION,
      getCurrentDocumentRevision: () => storeRef.current?.getState().document.revision ?? 0,
    });
    const store = createCalculatorStore(rulePackage, undefined, evaluator, {
      scoringStrategies: commonSimpleScoringStrategyRegistry,
      extraScoringCalculators: commonSimpleExtraScoringCalculatorRegistry,
    });
    storeRef.current = store;
    const engineErrorRecovery = createEngineErrorRecoveryService({
      store,
      draftProtectionPort: draftPort,
      undoPort: createCalculatorUndoPort(store),
      clipboardPort: createBrowserClipboardPort(),
      appVersion: APP_VERSION,
      engineVersion: ENGINE_VERSION,
    });
    const analysisLifecycle = createAnalysisLifecycleCoordinator({
      store,
      runAnalysis: engineErrorRecovery.runAnalysis,
    });

    return Object.freeze({
      store,
      quickCalcEvaluator: createQuickCalcEvaluator({
        scoringStrategies: commonSimpleScoringStrategyRegistry,
        extraScoringCalculators: commonSimpleExtraScoringCalculatorRegistry,
      }),
      ruleRepository,
      preferencesPort,
      replaceGuard: createCalculatorReplaceGuard(store, draftPort),
      readyAnalysisService: createReadyAnalysisService({
        client: engineWorkerClient,
        engineVersion: ENGINE_VERSION,
        getCurrentDocumentRevision: () => storeRef.current?.getState().document.revision ?? 0,
      }),
      engineErrorRecovery,
      analysisLifecycle,
    });
  })();

  return calculatorRuntimePromise;
}

export async function loadCalculatorStore(): Promise<CalculatorStore> {
  return (await loadCalculatorRuntime()).store;
}
