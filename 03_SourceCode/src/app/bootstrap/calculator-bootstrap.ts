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
  commonSimpleCapabilityRegistry,
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
import {
  createStorageCapability,
  type StorageCapability,
} from '../../application/persistence/storage-capability';
import {
  createCommandHistory,
  type CommandHistory,
} from '../../application/persistence/command-history';
import {
  createDraftController,
  type DraftController,
} from '../../application/persistence/draft-controller';
import { DexieDraftRepository } from '../../infrastructure/db/dexie-draft-repository';
import { DexieRuleSnapshots } from '../../infrastructure/db/dexie-rule-snapshots';
import { createBrowserEditorSignal } from '../../infrastructure/db/browser-editor-signal';
import { createBrowserEditorLock } from '../../infrastructure/db/browser-editor-lock';
import { canUseHistoricalRule } from '../../application/persistence/historical-rule-compatibility';

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
  persistence?: Readonly<{
    storage: StorageCapability;
    drafts: DraftController;
    history: CommandHistory;
  }>;
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
    const draftRef: { current: DraftController | undefined } = { current: undefined };
    const canEdit = () => draftRef.current?.canEdit() ?? false;
    const store = createCalculatorStore(
      rulePackage,
      undefined,
      evaluator,
      {
        scoringStrategies: commonSimpleScoringStrategyRegistry,
        extraScoringCalculators: commonSimpleExtraScoringCalculatorRegistry,
      },
      { canEdit },
    );
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

    const replaceGuard = createCalculatorReplaceGuard(store, draftPort, canEdit);
    const storage = createStorageCapability();
    const db = new MahjongDatabase();
    const repository = new DexieSavedExampleRepository(db, storage);
    const snapshots = new DexieRuleSnapshots(db, storage);
    const history = createCommandHistory(store, canEdit);
    // Dexie opens lazily. Storage failure must not reject Calculator/Encyclopedia bootstrap.
    const savedExamples = createSavedExampleService({
      calculator: store,
      repository,
      trash: repository,
      snapshots,
      storage,
      canEdit,
      canUseRule: (rule) =>
        canUseHistoricalRule(rule, ENGINE_VERSION, commonSimpleCapabilityRegistry),
      rules: ruleRepository,
      replaceGuard,
      clock: { now: () => new Date().toISOString() },
      ids: { next: () => crypto.randomUUID() },
      engineVersion: ENGINE_VERSION,
      databaseSchemaVersion: DATABASE_SCHEMA_VERSION,
    });
    const draftController = createDraftController({
      calculator: store,
      repository: new DexieDraftRepository(db, storage),
      rules: ruleRepository,
      examples: savedExamples,
      storage,
      history,
      owner: crypto.randomUUID(),
      id: () => crypto.randomUUID(),
      now: () => Date.now(),
      signal: createBrowserEditorSignal(),
      lock: createBrowserEditorLock(),
    });
    draftRef.current = draftController;
    await draftController.start();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') void draftController.flush();
    });
    window.addEventListener('pagehide', () => {
      void draftController.leave();
    });
    window.addEventListener('pageshow', () => {
      void draftController.check();
    });
    window.addEventListener('hashchange', () => {
      void draftController.flush();
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
      persistence: { storage, drafts: draftController, history },
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
