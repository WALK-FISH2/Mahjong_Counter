import { useEffect, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { useOutletContext } from 'react-router-dom';

import {
  getAddedKongUpgradeTile,
  getCalculatorStatus,
  getDisplayedConcealedTiles,
  getInputLimitTileCounts,
  getWinningTileConfirmation,
  type CalculatorInputRejection,
  type CalculatorStore,
  type CalculatorTransientInputKind,
} from '../../application/calculator/calculator-store';
import type { CalculatorRuntime } from '../../app/bootstrap/calculator-bootstrap';
import {
  consumeOnboarding,
  confirmTestingRule,
  recordRecentlyUsedRule,
  requiresTestingRuleConfirmation,
} from '../../application/preferences';
import {
  createNewHandReplacement,
  createRuleSwitchReplacement,
  type RuleSwitchCompatibilityMode,
} from '../../application/calculator/replace-calculator';
import type { RuleCatalogEntry } from '../../application/rules/rule-repository';
import type { OpenKongKind } from '../../domain/mahjong/meld';
import type { TileCode } from '../../domain/mahjong/tile';
import { countHandTilesByCode } from '../../domain/mahjong/validation';
import { AnalyzeActionBar } from '../../features/calculator-status/AnalyzeActionBar';
import { CorrectionStatusPanel } from '../../features/calculator-status/CorrectionStatusPanel';
import { EnteredHandBoard } from '../../features/tile-input/EnteredHandBoard';
import { IncompleteChowGuard } from '../../features/tile-input/IncompleteChowGuard';
import { MeldInputControls } from '../../features/tile-input/MeldInputControls';
import { TilePalette } from '../../features/tile-input/TilePalette';
import { TransientInputPanel } from '../../features/tile-input/TransientInputPanel';
import { WinningTileConfirmation } from '../../features/tile-input/WinningTileConfirmation';
import { WinContextPanel } from '../../features/win-context/WinContextPanel';
import { CalculatorHeader } from './CalculatorHeader';
import { CalculatorOnboarding } from '../../features/onboarding/CalculatorOnboarding';
import { RulePickerDialog } from '../../features/rule-switch/RulePickerDialog';
import { RuleSwitchDialog } from '../../features/rule-switch/RuleSwitchDialog';
import { TestingRuleConfirmationDialog } from '../../features/rule-switch/TestingRuleConfirmationDialog';
import { navigationStore } from '../../app/routes/navigation-store';
import { getResultActionPolicy } from '../../application/calculator/result-action-policy';
import { AnalysisResult } from '../../features/analysis-result/AnalysisResult';
import { EngineErrorRecoveryPanel } from '../../features/analysis-result/EngineErrorRecoveryPanel';
import { TemporaryRuleAdjustmentDialog } from '../../features/rule-adjustment/TemporaryRuleAdjustmentDialog';
import { QuickCalcPanel } from '../../features/quick-calc/QuickCalcPanel';
import { ReadyAnalysisPanel } from '../../features/ready-analysis/ReadyAnalysisPanel';
import {
  sortDiscardCandidates,
  type ReadyAnalysisOutcome,
  type WaitSortMode,
} from '../../application/ready-analysis';

export type CalculatorPageProps = Readonly<{
  store?: CalculatorStore | undefined;
  runtime?: CalculatorRuntime | undefined;
  loadFailed?: boolean;
}>;

type OnboardingState = Readonly<{ showRuleNotice: boolean; showInputGuide: boolean }>;
type ReplacementPrompt = Readonly<{
  message: string;
  resolve: (confirmed: boolean) => void;
}>;

type PendingChowAction = Readonly<
  | { kind: 'start-transient'; inputKind: CalculatorTransientInputKind; openKind?: OpenKongKind }
  | { kind: 'start-winning-tile' }
  | { kind: 'remove-winning-tile' }
  | { kind: 'confirm-winning-tile'; originalIndex: number }
  | { kind: 'cancel-transient' }
  | { kind: 'edit-meld'; meldId: string }
  | { kind: 'upgrade-pung'; meldId: string }
>;

function CalculatorLoading({ failed }: Readonly<{ failed: boolean }>) {
  return (
    <section className="page-shell calculator-load-state" aria-labelledby="calculator-title">
      <h1 id="calculator-title">算番</h1>
      <p role={failed ? 'alert' : 'status'}>
        {failed ? '当前规则加载失败，请刷新后重试。' : '正在载入当前规则…'}
      </p>
    </section>
  );
}

function rejectionMessage(reasonCode: CalculatorInputRejection): string {
  switch (reasonCode) {
    case 'TILE_NOT_ENABLED':
      return '当前规则不使用这张牌。';
    case 'TILE_NOT_CONCEALED':
      return '这张牌不能加入当前结构录入。';
    case 'TILE_NOT_FLOWER':
      return '花牌录入只能选择当前规则启用的具体花牌。';
    case 'TILE_COPY_LIMIT_REACHED':
      return '这张牌已达到当前规则允许的全局数量上限。';
    case 'INVALID_CHOW':
      return '第三张必须与前两张组成同花色连续的吃牌；前两张已保留。';
    case 'MELD_LIMIT_REACHED':
      return '已达到当前规则允许的副露组数上限。';
    case 'MELD_TYPE_NOT_ALLOWED':
      return '当前规则不允许这种副露。';
    case 'OPEN_KONG_KIND_NOT_ALLOWED':
      return '当前规则不允许这种明杠类型。';
    case 'FLOWERS_NOT_SUPPORTED':
      return '当前规则不支持花牌。';
    case 'TRANSIENT_INPUT_NOT_ACTIVE':
      return '请先选择吃、碰、杠或花牌录入方式。';
    case 'MELD_NOT_FOUND':
      return '目标牌组已不存在，请重新操作。';
    case 'ADDED_KONG_TILE_MISMATCH':
      return '加杠必须选择原碰牌的同一种牌。';
    case 'CONTEXT_FIELD_NOT_AVAILABLE':
      return '该和牌条件当前不可用。';
    case 'CONTEXT_VALUE_INVALID':
      return '该和牌条件值不符合当前规则定义。';
    case 'ANALYSIS_NOT_READY':
      return '请先完成牌面并补齐必填和牌条件。';
    case 'ANALYSIS_UNAVAILABLE':
      return '当前分析引擎尚未就绪。';
    case 'ANALYSIS_FAILED':
      return '本次分析失败，请检查牌面后重试。';
    case 'TEMPORARY_ADJUSTMENT_INVALID':
      return '本次规则调整不符合当前规则声明。';
    case 'FAN_ADJUSTMENT_INVALID':
      return '只能调整当前方案中已经识别且允许操作的番型。';
  }
}

type LoadedCalculatorPageProps = Readonly<{
  store: CalculatorStore;
  runtime?: CalculatorRuntime | undefined;
}>;

function QuickCalcEntry({ onOpen }: Readonly<{ onOpen: () => void }>) {
  return (
    <section className="quick-calc-entry" aria-labelledby="quick-calc-entry-title">
      <div>
        <p className="section-kicker">次级工具</p>
        <h2 id="quick-calc-entry-title">已经知道番型？</h2>
        <p>无需录入牌面，按当前规则临时合计；结果不会验证实际手牌。</p>
      </div>
      <button type="button" className="secondary-action" onClick={onOpen}>
        我已知道番型，只想快速合计
      </button>
    </section>
  );
}

function LoadedCalculatorPage({ store, runtime }: LoadedCalculatorPageProps) {
  const outletContext = useOutletContext<{ restoreCalculatorScroll?: number } | null>();
  const analysisSectionRef = useRef<HTMLElement>(null);
  const readyAnalysisRequestRef = useRef(0);
  const [inputNotice, setInputNotice] = useState<string | null>(null);
  const [selectingWinningTile, setSelectingWinningTile] = useState(false);
  const [pendingChowAction, setPendingChowAction] = useState<PendingChowAction | null>(null);
  const [dismissedConfirmationRevision, setDismissedConfirmationRevision] = useState<number | null>(
    null,
  );
  const [showRulePicker, setShowRulePicker] = useState(false);
  const [pendingRuleSwitch, setPendingRuleSwitch] = useState<RuleCatalogEntry | null>(null);
  const [pendingTestingRule, setPendingTestingRule] = useState<RuleCatalogEntry | null>(null);
  const [pendingTestingAction, setPendingTestingAction] = useState<
    'analysis' | 'ready-analysis' | 'rule-switch' | null
  >(null);
  const [replacementPrompt, setReplacementPrompt] = useState<ReplacementPrompt | null>(null);
  const [showQuickCalc, setShowQuickCalc] = useState(false);
  const [readyAnalysisStatus, setReadyAnalysisStatus] = useState<
    'idle' | 'analyzing' | 'result' | 'error'
  >('idle');
  const [readyAnalysisResult, setReadyAnalysisResult] = useState<ReadyAnalysisOutcome | null>(null);
  const [readyAnalysisRevision, setReadyAnalysisRevision] = useState<number | null>(null);
  const [selectedDiscardTile, setSelectedDiscardTile] = useState<TileCode | null>(null);
  const [legalWinDiscardView, setLegalWinDiscardView] = useState(false);
  const [waitSortMode, setWaitSortMode] = useState<WaitSortMode>('highest-score');
  const [onboarding, setOnboarding] = useState<OnboardingState>({
    showRuleNotice: false,
    showInputGuide: false,
  });
  const document = useStore(store, (state) => state.document);
  const rulePackage = useStore(store, (state) => state.rulePackage);
  const concealedSortMode = useStore(store, (state) => state.concealedSortMode);
  const editingMeldId = useStore(store, (state) => state.editingMeldId);
  const undoHand = useStore(store, (state) => state.undoHand);
  const analysisStatus = useStore(store, (state) => state.analysisStatus);
  const analysisResult = useStore(store, (state) => state.analysisResult);
  const layeredEvaluation = useStore(store, (state) => state.layeredEvaluation);
  const activeEvaluationLayer = useStore(store, (state) => state.activeEvaluationLayer);
  const selectedAnalysisCandidateId = useStore(store, (state) => state.selectedAnalysisCandidateId);
  const analysisAvailable = useStore(store, (state) => state.analysisAvailable);
  const lastContextRemovals = useStore(store, (state) => state.lastContextRemovals);
  const addConcealedTile = useStore(store, (state) => state.addConcealedTile);
  const removeConcealedTile = useStore(store, (state) => state.removeConcealedTile);
  const arrangeConcealedTiles = useStore(store, (state) => state.arrangeConcealedTiles);
  const setWinningTile = useStore(store, (state) => state.setWinningTile);
  const removeWinningTile = useStore(store, (state) => state.removeWinningTile);
  const confirmWinningTileFromConcealed = useStore(
    store,
    (state) => state.confirmWinningTileFromConcealed,
  );
  const beginTransientInput = useStore(store, (state) => state.beginTransientInput);
  const beginMeldEdit = useStore(store, (state) => state.beginMeldEdit);
  const beginAddedKongUpgrade = useStore(store, (state) => state.beginAddedKongUpgrade);
  const selectTransientTile = useStore(store, (state) => state.selectTransientTile);
  const removeTransientChowTile = useStore(store, (state) => state.removeTransientChowTile);
  const cancelTransientInput = useStore(store, (state) => state.cancelTransientInput);
  const removeMeld = useStore(store, (state) => state.removeMeld);
  const removeFlower = useStore(store, (state) => state.removeFlower);
  const undoLastHandChange = useStore(store, (state) => state.undoLastHandChange);
  const setContextMode = useStore(store, (state) => state.setContextMode);
  const updateContextValue = useStore(store, (state) => state.updateContextValue);
  const clearContextValue = useStore(store, (state) => state.clearContextValue);
  const undoContextRemovals = useStore(store, (state) => state.undoContextRemovals);
  const clearCorrectionIssue = useStore(store, (state) => state.clearCorrectionIssue);
  const cancelAnalysis = useStore(store, (state) => state.cancelAnalysis);
  const selectAnalysisCandidate = useStore(store, (state) => state.selectAnalysisCandidate);
  const applyTemporaryRuleAdjustment = useStore(
    store,
    (state) => state.applyTemporaryRuleAdjustment,
  );
  const restoreSystemPreset = useStore(store, (state) => state.restoreSystemPreset);
  const setActiveEvaluationLayer = useStore(store, (state) => state.setActiveEvaluationLayer);
  const applyFanAdjustment = useStore(store, (state) => state.applyFanAdjustment);
  const clearFanAdjustment = useStore(store, (state) => state.clearFanAdjustment);
  const undoRuleSwitch = useStore(store, (state) => state.undoRuleSwitch);
  const ruleSwitchUndo = useStore(store, (state) => state.ruleSwitchUndo);
  const modalStack = useStore(navigationStore, (state) => state.modalStack);
  const activeModal = modalStack.at(-1) ?? null;
  const displayedTiles = getDisplayedConcealedTiles(document, concealedSortMode);
  const formalTileCounts = countHandTilesByCode(document.hand);
  const inputTileCounts = getInputLimitTileCounts(document, editingMeldId);
  const winningTileConfirmation = getWinningTileConfirmation(document, rulePackage);
  const addedKongTile = getAddedKongUpgradeTile(document, editingMeldId);
  const showWinningTileConfirmation =
    winningTileConfirmation !== null && dismissedConfirmationRevision !== document.revision;
  const hasIncompleteChow =
    document.transientInput.kind === 'chow' && document.transientInput.selected.length > 0;
  const calculatorStatus = getCalculatorStatus({
    document,
    rulePackage,
    analysisStatus,
    analysisResult,
    analysisAvailable,
  });
  const readyAnalysisKind = runtime?.readyAnalysisService.getKind(document, rulePackage) ?? null;
  const currentReadyAnalysisResult =
    readyAnalysisResult?.documentRevision === document.revision ? readyAnalysisResult : null;
  const currentReadyAnalysisStatus =
    readyAnalysisRevision === document.revision ? readyAnalysisStatus : 'idle';
  const activeLegalWinDiscardView =
    legalWinDiscardView &&
    readyAnalysisRevision === document.revision &&
    analysisResult?.status === 'legal-win';
  const discardCandidates =
    currentReadyAnalysisResult?.kind === 'discard-to-ready'
      ? currentReadyAnalysisResult.primary.candidates.map(({ discard }) => discard)
      : [];

  useEffect(() => {
    if (runtime === undefined) return;
    let active = true;
    void Promise.all([
      consumeOnboarding(runtime.preferencesPort),
      runtime.preferencesPort.read(),
    ]).then(([nextOnboarding, preferences]) => {
      if (!active) return;
      setOnboarding(nextOnboarding);
      setWaitSortMode(preferences.waitSortMode);
    });
    return () => {
      active = false;
    };
  }, [runtime]);

  useEffect(() => {
    const scrollY = outletContext?.restoreCalculatorScroll ?? 0;
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => window.scrollTo({ top: scrollY }));
    });
    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [outletContext?.restoreCalculatorScroll]);

  useEffect(() => {
    const handlePopState = () => {
      const topModal = navigationStore.getState().modalStack.at(-1);
      if (topModal !== undefined) navigationStore.getState().closeModal(topModal);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const openModal = (modalId: string, replaceCurrent = false): void => {
    const currentModal = navigationStore.getState().modalStack.at(-1);
    if (replaceCurrent && currentModal !== undefined) {
      navigationStore.getState().closeModal(currentModal);
      navigationStore.getState().openModal(modalId);
      window.history.replaceState({ mahjongModal: modalId }, '', window.location.href);
      return;
    }
    navigationStore.getState().openModal(modalId);
    window.history.pushState({ mahjongModal: modalId }, '', window.location.href);
  };

  const closeActiveModal = (): void => {
    if (navigationStore.getState().modalStack.length === 0) return;
    window.history.back();
  };

  const confirmReplacement = (message: string) =>
    new Promise<boolean>((resolve) => {
      setReplacementPrompt({ message, resolve });
      openModal('replace-guard', true);
    });

  const closeRulePicker = () => {
    setShowRulePicker(false);
    closeActiveModal();
  };

  const chooseRule = async (entry: RuleCatalogEntry): Promise<void> => {
    if (runtime === undefined) return;
    if (
      await requiresTestingRuleConfirmation(
        runtime.preferencesPort,
        entry.manifest,
        entry.resultImpactVersion,
      )
    ) {
      setPendingTestingRule(entry);
      setPendingTestingAction('rule-switch');
      openModal('testing-rule-confirmation', true);
      return;
    }
    setShowRulePicker(false);
    setPendingRuleSwitch(entry);
    openModal('rule-switch', true);
  };

  const performRuleSwitch = async (
    entry: RuleCatalogEntry,
    mode: RuleSwitchCompatibilityMode,
  ): Promise<void> => {
    if (runtime === undefined) return;
    const currentDocument = store.getState().document;
    const result = await runtime.replaceGuard.prepareToReplaceCalculator(
      'rule-switch',
      () => confirmReplacement('切换规则会替换当前计算状态，是否继续？'),
      async () =>
        createRuleSwitchReplacement(
          currentDocument,
          await runtime.ruleRepository.getInstalledRule(entry.manifest),
          mode,
        ),
    );
    setPendingRuleSwitch(null);
    if (result.status === 'replaced') {
      await recordRecentlyUsedRule(runtime.preferencesPort, entry.manifest);
      setInputNotice('规则已切换；可撤销本次切换。');
    } else if (result.status === 'draft-protection-failed') {
      setInputNotice('当前计算保护失败，未切换规则。');
    }
  };

  const applyResult = (
    result: { accepted: true } | { accepted: false; reasonCode: CalculatorInputRejection },
    successMessage?: string,
  ) => {
    if (result.accepted) {
      setInputNotice(successMessage ?? null);
      return true;
    }
    setInputNotice(rejectionMessage(result.reasonCode));
    return false;
  };

  const runPendingAction = (action: PendingChowAction): void => {
    switch (action.kind) {
      case 'start-transient':
        if (applyResult(beginTransientInput(action.inputKind, action.openKind))) {
          setSelectingWinningTile(false);
        }
        break;
      case 'start-winning-tile':
        cancelTransientInput();
        setSelectingWinningTile(true);
        setInputNotice('请从选牌器选择一张胡牌张。');
        break;
      case 'remove-winning-tile':
        if (removeWinningTile()) {
          setSelectingWinningTile(false);
          setInputNotice('已移除胡牌张。');
        }
        break;
      case 'confirm-winning-tile':
        if (
          applyResult(
            confirmWinningTileFromConcealed(action.originalIndex),
            '已将所选牌移入独立胡牌张。',
          )
        ) {
          setSelectingWinningTile(false);
        }
        break;
      case 'cancel-transient':
        cancelTransientInput();
        break;
      case 'edit-meld':
        applyResult(beginMeldEdit(action.meldId));
        break;
      case 'upgrade-pung':
        applyResult(beginAddedKongUpgrade(action.meldId));
        break;
    }
  };

  const guardIncompleteChow = (action: PendingChowAction): boolean => {
    if (!hasIncompleteChow) {
      runPendingAction(action);
      return false;
    }
    setPendingChowAction(action);
    return true;
  };

  const handlePaletteTile = (tile: TileCode): void => {
    if (selectingWinningTile) {
      if (
        guardIncompleteChow({ kind: 'start-winning-tile' }) ||
        !applyResult(setWinningTile(tile), '胡牌张已更新。')
      ) {
        return;
      }
      setSelectingWinningTile(false);
      return;
    }

    if (document.transientInput.kind !== 'none') {
      const result = selectTransientTile(tile);
      if (!result.accepted) {
        setInputNotice(rejectionMessage(result.reasonCode));
      } else if (result.completed) {
        setInputNotice('牌组已加入正式牌面，已返回手牌录入。');
      } else {
        setInputNotice(null);
      }
      return;
    }

    applyResult(addConcealedTile(tile));
  };

  const runReadyAnalysis = async (): Promise<void> => {
    if (runtime === undefined) return;
    const currentDocument = store.getState().document;
    const currentRule = store.getState().rulePackage;
    readyAnalysisRequestRef.current += 1;
    const requestToken = readyAnalysisRequestRef.current;
    setReadyAnalysisRevision(currentDocument.revision);
    setReadyAnalysisStatus('analyzing');
    try {
      const outcome = await runtime.readyAnalysisService.analyze(currentDocument, currentRule);
      if (readyAnalysisRequestRef.current !== requestToken) return;
      setReadyAnalysisResult(outcome);
      setReadyAnalysisStatus('result');
      setSelectedDiscardTile(
        outcome.kind === 'discard-to-ready'
          ? (sortDiscardCandidates(outcome.primary.candidates, waitSortMode)[0]?.discard ?? null)
          : null,
      );
    } catch {
      if (
        readyAnalysisRequestRef.current === requestToken &&
        store.getState().document.revision === currentDocument.revision
      ) {
        setReadyAnalysisStatus('error');
      }
    }
  };

  const runLegalWinDiscardAnalysis = async (): Promise<void> => {
    if (runtime === undefined) return;
    const currentDocument = store.getState().document;
    const currentRule = store.getState().rulePackage;
    readyAnalysisRequestRef.current += 1;
    const requestToken = readyAnalysisRequestRef.current;
    setLegalWinDiscardView(true);
    setReadyAnalysisRevision(currentDocument.revision);
    setReadyAnalysisStatus('analyzing');
    try {
      const outcome = await runtime.readyAnalysisService.analyzeDiscardIgnoringWinningTile(
        currentDocument,
        currentRule,
      );
      if (readyAnalysisRequestRef.current !== requestToken) return;
      setReadyAnalysisResult(outcome);
      setReadyAnalysisStatus('result');
      setSelectedDiscardTile(
        sortDiscardCandidates(outcome.primary.candidates, waitSortMode)[0]?.discard ?? null,
      );
    } catch {
      if (
        readyAnalysisRequestRef.current === requestToken &&
        store.getState().document.revision === currentDocument.revision
      ) {
        setReadyAnalysisStatus('error');
      }
    }
  };

  const runFormalAnalysis = () =>
    runtime?.engineErrorRecovery.runAnalysis() ?? store.getState().startAnalysis();

  const requestReadyAnalysis = (): void => {
    if (runtime === undefined) return;
    void (async () => {
      if (rulePackage.manifest.status === 'test') {
        const entry = (await runtime.ruleRepository.listRuleCatalog()).find(
          ({ manifest }) =>
            manifest.ruleId === rulePackage.manifest.ruleId &&
            manifest.ruleVersion === rulePackage.manifest.ruleVersion,
        );
        if (
          entry !== undefined &&
          (await requiresTestingRuleConfirmation(
            runtime.preferencesPort,
            entry.manifest,
            entry.resultImpactVersion,
          ))
        ) {
          setPendingTestingRule(entry);
          setPendingTestingAction('ready-analysis');
          openModal('testing-rule-confirmation');
          return;
        }
      }
      await runReadyAnalysis();
    })();
  };

  const inputLabel = selectingWinningTile
    ? '当前录入到胡牌张'
    : document.transientInput.kind === 'none'
      ? '默认录入到手牌'
      : '当前用于临时牌组';

  return (
    <article className="calculator-page" aria-labelledby="calculator-title">
      <CalculatorHeader
        manifest={rulePackage.manifest}
        document={document}
        onNewHand={
          runtime === undefined
            ? undefined
            : () => {
                void runtime.replaceGuard
                  .prepareToReplaceCalculator(
                    'new-hand',
                    () => confirmReplacement('新建牌面会清除本次计算状态，是否继续？'),
                    () => createNewHandReplacement(store.getState().rulePackage),
                  )
                  .then((result) => {
                    if (result.status === 'replaced') setInputNotice('已新建牌面。');
                    if (result.status === 'draft-protection-failed') {
                      setInputNotice('当前计算保护失败，未新建牌面。');
                    }
                  });
              }
        }
        onOpenRulePicker={
          runtime === undefined
            ? undefined
            : () => {
                setShowRulePicker(true);
                openModal('rule-picker');
              }
        }
      />

      <CalculatorOnboarding
        {...onboarding}
        onDismiss={() => setOnboarding({ showRuleNotice: false, showInputGuide: false })}
      />

      {ruleSwitchUndo !== null && (
        <p className="input-notice" role="status">
          规则已切换。
          <button className="secondary-action" type="button" onClick={undoRuleSwitch}>
            撤销规则切换
          </button>
        </p>
      )}

      {runtime !== undefined &&
        (showQuickCalc ? (
          <QuickCalcPanel
            key={`${rulePackage.manifest.ruleId}@${rulePackage.manifest.ruleVersion}`}
            rulePackage={rulePackage}
            evaluate={runtime.quickCalcEvaluator}
            onClose={() => setShowQuickCalc(false)}
          />
        ) : (
          <QuickCalcEntry onOpen={() => setShowQuickCalc(true)} />
        ))}

      <div
        className="calculator-layout"
        data-testid="calculator-layout"
        hidden={showQuickCalc && runtime !== undefined}
      >
        <div className="calculator-layout__input">
          <TilePalette
            tileSet={rulePackage.tileSet}
            tileCounts={formalTileCounts}
            limitCounts={inputTileCounts}
            inputLabel={inputLabel}
            onTileSelect={handlePaletteTile}
          />

          <MeldInputControls
            rulePackage={rulePackage}
            activeKind={
              document.transientInput.kind === 'none' ? null : document.transientInput.kind
            }
            meldCount={document.hand.melds.length}
            onStart={(kind, openKind) => {
              const action: PendingChowAction =
                openKind === undefined
                  ? { kind: 'start-transient', inputKind: kind }
                  : { kind: 'start-transient', inputKind: kind, openKind };
              guardIncompleteChow(action);
            }}
          />

          {document.transientInput.kind !== 'none' && (
            <TransientInputPanel
              session={document.transientInput}
              editing={editingMeldId !== null}
              addedKongTile={addedKongTile}
              onRemoveChowTile={removeTransientChowTile}
              onCancel={() => {
                guardIncompleteChow({ kind: 'cancel-transient' });
              }}
            />
          )}

          {inputNotice !== null && (
            <p className="input-notice" role="status">
              {inputNotice}
            </p>
          )}

          {showWinningTileConfirmation && (
            <WinningTileConfirmation
              tiles={displayedTiles}
              recommendedOriginalIndex={winningTileConfirmation.recommendedOriginalIndex}
              onConfirm={(originalIndex) => {
                guardIncompleteChow({ kind: 'confirm-winning-tile', originalIndex });
              }}
              onDismiss={() => setDismissedConfirmationRevision(document.revision)}
            />
          )}

          <EnteredHandBoard
            concealedTiles={displayedTiles}
            melds={document.hand.melds}
            flowers={document.hand.flowers}
            winningTile={document.hand.winningTile}
            isArranged={concealedSortMode === 'tile-order'}
            canUndo={undoHand !== null}
            selectingWinningTile={selectingWinningTile}
            distinguishOpenKongKind={
              rulePackage.handModel.openKongPolicy.distinction === 'distinguished'
            }
            discardCandidateTiles={discardCandidates}
            selectedDiscardTile={selectedDiscardTile}
            canUpgradePung={(meld) =>
              meld.type === 'pung' &&
              rulePackage.handModel.openKongPolicy.allowedKinds.includes('added')
            }
            onRemoveConcealed={removeConcealedTile}
            onArrange={arrangeConcealedTiles}
            onSelectWinningTile={() => {
              if (selectingWinningTile) {
                setSelectingWinningTile(false);
                setInputNotice(null);
              } else {
                guardIncompleteChow({ kind: 'start-winning-tile' });
              }
            }}
            onRemoveWinningTile={() => {
              guardIncompleteChow({ kind: 'remove-winning-tile' });
            }}
            onEditMeld={(meldId) => {
              guardIncompleteChow({ kind: 'edit-meld', meldId });
            }}
            onUpgradePung={(meldId) => {
              guardIncompleteChow({ kind: 'upgrade-pung', meldId });
            }}
            onRemoveMeld={(meldId) => {
              removeMeld(meldId);
              setInputNotice('已删除完整牌组；可撤销本次修改。');
            }}
            onRemoveFlower={(index) => {
              removeFlower(index);
              setInputNotice('已移除花牌；可撤销本次修改。');
            }}
            onUndo={() => {
              if (undoLastHandChange()) {
                setInputNotice('已撤销上次牌面修改。');
              }
            }}
            onSelectDiscardCandidate={setSelectedDiscardTile}
          />
        </div>

        <div className="calculator-layout__analysis">
          <CorrectionStatusPanel
            issues={calculatorStatus.correctionIssues}
            onClearIssue={(issueId) => {
              if (clearCorrectionIssue(issueId)) {
                setInputNotice('已按你的操作清除定位到的异常内容；可撤销本次修改。');
              }
            }}
          />

          <WinContextPanel
            mode={document.context.mode}
            values={document.context.values}
            definitions={rulePackage.contexts}
            missingContextIds={calculatorStatus.missingContextIds}
            removedContextIds={lastContextRemovals.map(({ contextId }) => contextId)}
            onModeChange={setContextMode}
            onValueChange={(contextId, value) => {
              applyResult(updateContextValue(contextId, value));
            }}
            onValueClear={clearContextValue}
            onUndoModeChange={undoContextRemovals}
          />

          <ReadyAnalysisPanel
            availableKind={activeLegalWinDiscardView ? 'discard-to-ready' : readyAnalysisKind}
            status={currentReadyAnalysisStatus}
            result={currentReadyAnalysisResult}
            sortMode={waitSortMode}
            selectedDiscard={selectedDiscardTile}
            onAnalyze={
              activeLegalWinDiscardView
                ? () => void runLegalWinDiscardAnalysis()
                : requestReadyAnalysis
            }
            onCancel={() => {
              readyAnalysisRequestRef.current += 1;
              runtime?.readyAnalysisService.cancel();
              setReadyAnalysisStatus('idle');
            }}
            onSelectDiscard={setSelectedDiscardTile}
            independentLegalWinView={activeLegalWinDiscardView}
            onReturnToFormalResult={() => {
              readyAnalysisRequestRef.current += 1;
              runtime?.readyAnalysisService.cancel();
              setLegalWinDiscardView(false);
              setReadyAnalysisStatus('idle');
              setReadyAnalysisResult(null);
              setSelectedDiscardTile(null);
              analysisSectionRef.current?.scrollIntoView({ block: 'center' });
              analysisSectionRef.current?.focus();
            }}
          />

          <section
            ref={analysisSectionRef}
            className="calculator-panel analysis-summary"
            aria-labelledby="analysis-title"
            tabIndex={-1}
          >
            <p className="section-kicker">当前状态</p>
            <h2 id="analysis-title">分析结果</h2>
            {analysisStatus === 'analyzing' ? (
              <p role="status">正在分析当前牌面…</p>
            ) : analysisResult === null ? (
              runtime === undefined ? (
                <p>尚未开始分析</p>
              ) : (
                <EngineErrorRecoveryPanel
                  service={runtime.engineErrorRecovery}
                  idleContent={<p>尚未开始分析</p>}
                />
              )
            ) : (
              <AnalysisResult
                result={analysisResult}
                selectedCandidateId={selectedAnalysisCandidateId}
                rulePackage={rulePackage}
                originalHand={document.hand}
                onSelectCandidate={selectAnalysisCandidate}
                onOpenAdjustments={() => openModal('temporary-rule-adjustment')}
                activeLayer={activeEvaluationLayer}
                availableLayers={
                  layeredEvaluation === null
                    ? ['preset']
                    : [
                        'preset',
                        ...(layeredEvaluation.sessionRule === undefined
                          ? []
                          : (['session-rule'] as const)),
                        ...(layeredEvaluation.userAdjustment === undefined
                          ? []
                          : (['user-adjustment'] as const)),
                      ]
                }
                userAdjustedResult={layeredEvaluation?.userAdjustment?.result ?? null}
                actionPolicy={getResultActionPolicy(analysisResult.status)}
                onSelectLayer={setActiveEvaluationLayer}
                onApplyFanAdjustment={(patternId, action) => {
                  applyResult(
                    applyFanAdjustment(patternId, action),
                    action === 'exclude'
                      ? '已在用户调整结果中取消计入该番型；基础合法性保持不变。'
                      : '已在用户调整结果中强制计入该番型；基础合法性保持不变。',
                  );
                }}
                onClearFanAdjustment={(patternId) => {
                  if (clearFanAdjustment(patternId)) setInputNotice('已清除该番型人工调整。');
                }}
                {...(runtime === undefined
                  ? {}
                  : { onContinueDiscardAnalysis: () => void runLegalWinDiscardAnalysis() })}
              />
            )}
          </section>
        </div>
      </div>

      {!(showQuickCalc && runtime !== undefined) && (
        <AnalyzeActionBar
          status={calculatorStatus}
          hasWinningTile={document.hand.winningTile !== null}
          onAnalyze={() => {
            void (async () => {
              if (runtime !== undefined && rulePackage.manifest.status === 'test') {
                const entry = (await runtime.ruleRepository.listRuleCatalog()).find(
                  ({ manifest }) =>
                    manifest.ruleId === rulePackage.manifest.ruleId &&
                    manifest.ruleVersion === rulePackage.manifest.ruleVersion,
                );
                if (
                  entry !== undefined &&
                  (await requiresTestingRuleConfirmation(
                    runtime.preferencesPort,
                    entry.manifest,
                    entry.resultImpactVersion,
                  ))
                ) {
                  setPendingTestingRule(entry);
                  setPendingTestingAction('analysis');
                  openModal('testing-rule-confirmation');
                  return;
                }
              }
              const result = await runFormalAnalysis();
              if (!result.accepted) setInputNotice(rejectionMessage(result.reasonCode));
            })();
          }}
          onCancel={cancelAnalysis}
          onViewResult={() => {
            analysisSectionRef.current?.scrollIntoView({ block: 'center' });
            analysisSectionRef.current?.focus();
          }}
        />
      )}

      {pendingChowAction !== null && (
        <IncompleteChowGuard
          onContinue={() => setPendingChowAction(null)}
          onStay={() => setPendingChowAction(null)}
          onAbandon={() => {
            const action = pendingChowAction;
            cancelTransientInput();
            setPendingChowAction(null);
            runPendingAction(action);
          }}
        />
      )}

      {runtime !== undefined && showRulePicker && activeModal === 'rule-picker' && (
        <RulePickerDialog
          ruleRepository={runtime.ruleRepository}
          preferencesPort={runtime.preferencesPort}
          currentRuleRef={document.ruleRef}
          onSelect={(entry) => void chooseRule(entry)}
          onClose={closeRulePicker}
        />
      )}

      {pendingTestingRule !== null &&
        runtime !== undefined &&
        activeModal === 'testing-rule-confirmation' && (
          <TestingRuleConfirmationDialog
            rule={pendingTestingRule}
            onCancel={() => {
              setPendingTestingRule(null);
              setPendingTestingAction(null);
              closeActiveModal();
            }}
            onConfirm={() => {
              void confirmTestingRule(
                runtime.preferencesPort,
                pendingTestingRule.manifest,
                pendingTestingRule.resultImpactVersion,
              ).then(() => {
                const entry = pendingTestingRule;
                setPendingTestingRule(null);
                if (pendingTestingAction === 'analysis') {
                  setPendingTestingAction(null);
                  closeActiveModal();
                  void runFormalAnalysis().then((result) => {
                    if (!result.accepted) setInputNotice(rejectionMessage(result.reasonCode));
                  });
                } else if (pendingTestingAction === 'ready-analysis') {
                  setPendingTestingAction(null);
                  closeActiveModal();
                  void runReadyAnalysis();
                } else {
                  setPendingTestingAction(null);
                  setShowRulePicker(false);
                  setPendingRuleSwitch(entry);
                  openModal('rule-switch', true);
                }
              });
            }}
          />
        )}

      {pendingRuleSwitch !== null && activeModal === 'rule-switch' && (
        <RuleSwitchDialog
          target={pendingRuleSwitch}
          onCancel={() => {
            setPendingRuleSwitch(null);
            closeActiveModal();
          }}
          onChoose={(mode) => void performRuleSwitch(pendingRuleSwitch, mode)}
        />
      )}

      {replacementPrompt !== null && activeModal === 'replace-guard' && (
        <div className="dialog-backdrop">
          <section
            className="calculator-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="replace-guard-title"
          >
            <h2 id="replace-guard-title">确认替换当前计算</h2>
            <p>{replacementPrompt.message}</p>
            <div className="dialog-actions">
              <button
                className="danger-action"
                type="button"
                onClick={() => {
                  replacementPrompt.resolve(true);
                  setReplacementPrompt(null);
                  closeActiveModal();
                }}
              >
                确认替换
              </button>
              <button
                className="secondary-action"
                type="button"
                onClick={() => {
                  replacementPrompt.resolve(false);
                  setReplacementPrompt(null);
                  closeActiveModal();
                }}
              >
                取消
              </button>
            </div>
          </section>
        </div>
      )}

      {activeModal === 'temporary-rule-adjustment' && (
        <TemporaryRuleAdjustmentDialog
          rulePackage={rulePackage}
          currentValues={document.temporaryRuleAdjustment?.values ?? {}}
          onApply={(values) => {
            if (
              applyResult(
                applyTemporaryRuleAdjustment(values),
                values !== null && Object.keys(values).length > 0
                  ? runtime?.analysisLifecycle.isAutomaticRecalculationEnabled()
                    ? '已保存本次规则调整，正在自动重新分析。'
                    : '已保存本次规则调整，请重新分析以形成完整的本次规则结果。'
                  : '当前使用系统预设规则。',
              )
            ) {
              closeActiveModal();
            }
          }}
          onRestore={() => {
            restoreSystemPreset();
            setInputNotice('已恢复系统预设规则。');
            closeActiveModal();
          }}
          onClose={closeActiveModal}
        />
      )}
    </article>
  );
}

export function CalculatorPage({ store, runtime, loadFailed = false }: CalculatorPageProps) {
  if (store === undefined) {
    return <CalculatorLoading failed={loadFailed} />;
  }

  return <LoadedCalculatorPage store={store} runtime={runtime} />;
}
