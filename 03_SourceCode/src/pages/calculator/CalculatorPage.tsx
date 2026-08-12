import { useRef, useState } from 'react';
import { useStore } from 'zustand';

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

export type CalculatorPageProps = Readonly<{
  store?: CalculatorStore | undefined;
  loadFailed?: boolean;
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
  }
}

function LoadedCalculatorPage({ store }: Readonly<{ store: CalculatorStore }>) {
  const analysisSectionRef = useRef<HTMLElement>(null);
  const [inputNotice, setInputNotice] = useState<string | null>(null);
  const [selectingWinningTile, setSelectingWinningTile] = useState(false);
  const [pendingChowAction, setPendingChowAction] = useState<PendingChowAction | null>(null);
  const [dismissedConfirmationRevision, setDismissedConfirmationRevision] = useState<number | null>(
    null,
  );
  const document = useStore(store, (state) => state.document);
  const rulePackage = useStore(store, (state) => state.rulePackage);
  const concealedSortMode = useStore(store, (state) => state.concealedSortMode);
  const editingMeldId = useStore(store, (state) => state.editingMeldId);
  const undoHand = useStore(store, (state) => state.undoHand);
  const analysisStatus = useStore(store, (state) => state.analysisStatus);
  const analysisResult = useStore(store, (state) => state.analysisResult);
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
  const startAnalysis = useStore(store, (state) => state.startAnalysis);
  const cancelAnalysis = useStore(store, (state) => state.cancelAnalysis);
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

  const inputLabel = selectingWinningTile
    ? '当前录入到胡牌张'
    : document.transientInput.kind === 'none'
      ? '默认录入到手牌'
      : '当前用于临时牌组';

  return (
    <article className="calculator-page" aria-labelledby="calculator-title">
      <CalculatorHeader manifest={rulePackage.manifest} document={document} />

      <div className="calculator-layout" data-testid="calculator-layout">
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

          <section
            ref={analysisSectionRef}
            className="calculator-panel analysis-summary"
            aria-labelledby="analysis-title"
            tabIndex={-1}
          >
            <p className="section-kicker">当前状态</p>
            <h2 id="analysis-title">分析结果</h2>
            <p>
              {analysisStatus === 'analyzing'
                ? '正在分析当前牌面…'
                : analysisResult === null
                  ? '尚未开始分析'
                  : '分析已完成；正式结果内容将在后续结果任务中展示。'}
            </p>
          </section>
        </div>
      </div>

      <AnalyzeActionBar
        status={calculatorStatus}
        hasWinningTile={document.hand.winningTile !== null}
        onAnalyze={() => {
          void startAnalysis().then((result) => {
            if (!result.accepted) setInputNotice(rejectionMessage(result.reasonCode));
          });
        }}
        onCancel={cancelAnalysis}
        onViewResult={() => {
          analysisSectionRef.current?.scrollIntoView({ block: 'center' });
          analysisSectionRef.current?.focus();
        }}
      />

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
    </article>
  );
}

export function CalculatorPage({ store, loadFailed = false }: CalculatorPageProps) {
  if (store === undefined) {
    return <CalculatorLoading failed={loadFailed} />;
  }

  return <LoadedCalculatorPage store={store} />;
}
