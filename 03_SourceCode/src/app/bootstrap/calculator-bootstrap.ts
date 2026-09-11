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
import { APP_VERSION, ENGINE_VERSION, DATABASE_SCHEMA_VERSION } from '../version';
import { createSavedExampleService, type SavedExampleService } from '../../application/examples';
import { MahjongDatabase } from '../../infrastructure/db/mahjong-database';
import { DexieSavedExampleRepository } from '../../infrastructure/db/dexie-saved-example-repository';
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
import type { EncyclopediaRuleCase } from '../../application/encyclopedia';
import { COMMON_SIMPLE_STRUCTURE_RULE_CASES } from '../../content/rules/common-simple/structure-rule-cases';

export type CalculatorRuntime = Readonly<{
  store: CalculatorStore;
  quickCalcEvaluator: QuickCalcEvaluator;
  ruleRepository: BuiltInRuleRepository;
  preferencesPort: InMemoryCalculatorPreferencesPort;
  replaceGuard: ReturnType<typeof createCalculatorReplaceGuard>;
  readyAnalysisService: ReadyAnalysisService;
  engineErrorRecovery: EngineErrorRecoveryService;
  analysisLifecycle: AnalysisLifecycleCoordinator;
  encyclopediaRuleCases: readonly EncyclopediaRuleCase[];
  savedExamples: SavedExampleService;
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

    const replaceGuard = createCalculatorReplaceGuard(store, draftPort);
    // Dexie opens lazily. Storage failure must not reject Calculator/Encyclopedia bootstrap.
    const savedExamples = createSavedExampleService({
      calculator: store,
      repository: new DexieSavedExampleRepository(new MahjongDatabase()),
      rules: ruleRepository,
      replaceGuard,
      clock: { now: () => new Date().toISOString() },
      ids: { next: () => crypto.randomUUID() },
      engineVersion: ENGINE_VERSION,
      databaseSchemaVersion: DATABASE_SCHEMA_VERSION,
    });
    return Object.freeze({
      store,
      quickCalcEvaluator: createQuickCalcEvaluator({
        scoringStrategies: commonSimpleScoringStrategyRegistry,
        extraScoringCalculators: commonSimpleExtraScoringCalculatorRegistry,
      }),
      ruleRepository,
      preferencesPort,
      replaceGuard,
      savedExamples,
      readyAnalysisService: createReadyAnalysisService({
        client: engineWorkerClient,
        engineVersion: ENGINE_VERSION,
        getCurrentDocumentRevision: () => storeRef.current?.getState().document.revision ?? 0,
      }),
      engineErrorRecovery,
      analysisLifecycle,
      encyclopediaRuleCases: COMMON_SIMPLE_STRUCTURE_RULE_CASES,
    });
  })();

  return calculatorRuntimePromise;
}

export async function loadCalculatorStore(): Promise<CalculatorStore> {
  return (await loadCalculatorRuntime()).store;
}
