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
import { createCalculatorReplaceGuard } from '../../application/calculator/replace-calculator';
import {
  type CalculatorPreferencesPort,
  type ManagedCalculatorPreferencesPort,
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
import {
  APP_VERSION,
  ENGINE_VERSION,
  DATABASE_SCHEMA_VERSION,
  SAVED_EXAMPLE_SCHEMA_VERSION,
} from '../version';
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
import { LocalPreferences } from '../../infrastructure/preferences/local-preferences';
import { createDatabaseMigrationService } from '../../application/persistence/database-migration';
import { DexieMigration } from '../../infrastructure/db/dexie-migration';
import { DexieLocalData } from '../../infrastructure/db/dexie-local-data';
import {
  createLocalDataManagement,
  type LocalDataManagement,
} from '../../application/persistence/local-data-management';
import type { CalculatorDocument } from '../../domain/mahjong';

export type CalculatorRuntime = Readonly<{
  store: CalculatorStore;
  quickCalcEvaluator: QuickCalcEvaluator;
  ruleRepository: BuiltInRuleRepository;
  preferencesPort: CalculatorPreferencesPort;
  localPreferences?: ManagedCalculatorPreferencesPort;
  localData?: LocalDataManagement;
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

export function loadCalculatorRuntime(): Promise<CalculatorRuntime> {
  calculatorRuntimePromise ??= (async () => {
    const preferencesPort = new LocalPreferences(() => window.localStorage);
    const systemTheme = window.matchMedia?.('(prefers-color-scheme: dark)');
    const systemMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const applyAppearance = () => {
      const preferences = preferencesPort.state.getState().preferences;
      document.documentElement.dataset.theme =
        preferences.theme === 'system'
          ? systemTheme?.matches === true
            ? 'dark'
            : 'light'
          : preferences.theme;
      document.documentElement.dataset.motion =
        preferences.motion === 'system'
          ? systemMotion?.matches === true
            ? 'reduced'
            : 'full'
          : preferences.motion;
    };
    preferencesPort.state.subscribe(applyAppearance);
    systemTheme?.addEventListener?.('change', applyAppearance);
    systemMotion?.addEventListener?.('change', applyAppearance);
    applyAppearance();
    const storage = createStorageCapability();
    const migration = await createDatabaseMigrationService(
      new DexieMigration({
        name: 'MahjongFanCalculatorDB',
        preferencesRaw: () => preferencesPort.raw(),
        id: () => crypto.randomUUID(),
        now: () => new Date().toISOString(),
      }),
      DATABASE_SCHEMA_VERSION,
    ).run();
    if (!migration.writable) storage.preserveReadOnly(migration.reason ?? 'MIGRATION_FAILED');
    const ruleRepository = createCommonSimpleRuleRepository();
    const lastRule = (await preferencesPort.read()).lastRuleRef;
    const rulePackage = await ruleRepository
      .getInstalledRule(lastRule ?? COMMON_SIMPLE_RULE_REF)
      .catch(() => ruleRepository.getInstalledRule(COMMON_SIMPLE_RULE_REF));
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
    const protect = async (document: CalculatorDocument) => {
      if (draftRef.current === undefined) throw new Error('DRAFT_NOT_READY');
      await draftRef.current.protectCurrentDraft(document);
    };
    const draftPort = { protectBeforeReplacement: protect, protectCurrentDraft: protect };
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
    const history = createCommandHistory(store, canEdit);
    const engineErrorRecovery = createEngineErrorRecoveryService({
      store,
      draftProtectionPort: draftPort,
      undoPort: history,
      clipboardPort: createBrowserClipboardPort(),
      appVersion: APP_VERSION,
      engineVersion: ENGINE_VERSION,
    });
    const analysisLifecycle = createAnalysisLifecycleCoordinator({
      store,
      runAnalysis: engineErrorRecovery.runAnalysis,
    });

    const replaceGuard = createCalculatorReplaceGuard(store, draftPort, canEdit);
    const db = new MahjongDatabase('MahjongFanCalculatorDB', undefined, migration.version);
    const repository = new DexieSavedExampleRepository(db, storage);
    const snapshots = new DexieRuleSnapshots(db, storage);
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
      databaseSchemaVersion: SAVED_EXAMPLE_SCHEMA_VERSION,
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
    const localData = createLocalDataManagement({
      data: new DexieLocalData({
        db,
        preferences: preferencesPort,
        storage,
        fence: () => draftController.clearFence(),
        now: () => Date.now(),
        estimate: () => navigator.storage?.estimate() ?? Promise.resolve({}),
      }),
      backup: {
        exportFullBackup() {
          return Promise.reject(new Error('完整备份导出尚未接入（M10）；未清除任何数据。'));
        },
      },
      canManage: () => draftController.canEdit() && storage.state.getState().mode === 'persistent',
      suspend: () => draftController.suspend(),
      resume: () => draftController.resume(),
      reset: () => draftController.resetAfterClear(),
    });
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
      localPreferences: preferencesPort,
      localData,
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
