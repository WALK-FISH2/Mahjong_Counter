import {
  sortDiscardCandidates,
  sortWaitCandidates,
  type ReadyAnalysisOutcome,
  type WaitSortMode,
} from '../../application/ready-analysis';
import { useState } from 'react';
import type { WaitAnalysisResult, WaitCandidate } from '../../domain/engine/ready-analysis';
import type { WinMode } from '../../domain/mahjong/context';
import { getTileMetadata, type TileCode } from '../../domain/mahjong/tile';
import { TileFace } from '../tile-input/TileFace';

export type ReadyAnalysisPanelProps = Readonly<{
  availableKind: 'wait-analysis' | 'discard-to-ready' | null;
  status: 'idle' | 'analyzing' | 'result' | 'error';
  result: ReadyAnalysisOutcome | null;
  sortMode: WaitSortMode;
  selectedDiscard: TileCode | null;
  onAnalyze: () => void;
  onCancel: () => void;
  onSelectDiscard: (tile: TileCode) => void;
}>;

function modeLabel(mode: WinMode): string {
  return mode === 'discard' ? '点炮' : '自摸';
}

function scoreUnitLabel(unit: string): string {
  return unit === 'fan' ? '番' : unit;
}

function candidateSignature(candidate: WaitCandidate | undefined): string {
  if (candidate === undefined) return 'none';
  return candidate.status === 'legal'
    ? `legal:${candidate.best.score.total}:${candidate.best.score.unit}`
    : candidate.status;
}

function candidateDescription(candidate: WaitCandidate | undefined): string {
  if (candidate === undefined) return '不是候选';
  if (candidate.status === 'legal') {
    return `合法 ${candidate.best.score.total} ${scoreUnitLabel(candidate.best.score.unit)}`;
  }
  return candidate.status === 'pending-context' ? '待补条件' : '仅结构可和';
}

function structuralReason(
  candidate: Extract<WaitCandidate, { status: 'structural-only' }>,
): string {
  return candidate.reasons
    .map(({ reasonCode, data }) =>
      reasonCode === 'MINIMUM_FAN_NOT_MET'
        ? `未达到最低 ${data.minimumFan} 番（当前 ${data.actualFan} 番）`
        : reasonCode,
    )
    .join('；');
}

function LegalWaitTile({
  candidate,
}: Readonly<{ candidate: Extract<WaitCandidate, { status: 'legal' }> }>) {
  const structureLabels: Readonly<Record<string, string>> = {
    'standard-meld-pair': '普通结构',
    'seven-pairs': '七对',
    'thirteen-orphans': '十三幺',
  };
  const structures = [
    ...new Set(
      candidate.highestLegalCandidates.map(({ placed }) => placed.decomposition.structureKey),
    ),
  ].map((structureKey) => structureLabels[structureKey] ?? structureKey);
  const [selectedCandidateId, setSelectedCandidateId] = useState(candidate.best.candidateId);
  const selectedCandidate =
    candidate.highestLegalCandidates.find(
      ({ candidateId }) => candidateId === selectedCandidateId,
    ) ?? candidate.best;
  const selectedStructureKey = selectedCandidate.placed.decomposition.structureKey;
  return (
    <li className="ready-wait-card" data-wait-status="legal">
      <span className="tile-button tile-button--static">
        <TileFace tile={candidate.tile} />
      </span>
      <div>
        <strong>{getTileMetadata(candidate.tile).chineseName}</strong>
        <p>
          最高合法结果：{candidate.best.score.total} {scoreUnitLabel(candidate.best.score.unit)}
        </p>
        <small>
          {structures.join('、')}
          {candidate.highestLegalCandidates.length > 1
            ? `（${candidate.highestLegalCandidates.length} 个并列最高拆分）`
            : ''}
        </small>
        {candidate.highestLegalCandidates.length > 1 && (
          <label className="ready-candidate-switcher">
            并列最高拆分
            <select
              aria-label={`${getTileMetadata(candidate.tile).chineseName}并列最高拆分`}
              value={selectedCandidate.candidateId}
              onChange={(event) => setSelectedCandidateId(event.target.value)}
            >
              {candidate.highestLegalCandidates.map((item, index) => (
                <option value={item.candidateId} key={item.candidateId}>
                  方案 {index + 1} ·{' '}
                  {structureLabels[item.placed.decomposition.structureKey] ??
                    item.placed.decomposition.structureKey}
                </option>
              ))}
            </select>
            <span>当前查看：{structureLabels[selectedStructureKey] ?? selectedStructureKey}</span>
          </label>
        )}
      </div>
    </li>
  );
}

function WaitList({
  result,
  sortMode,
}: Readonly<{ result: WaitAnalysisResult; sortMode: WaitSortMode }>) {
  const ordered = sortWaitCandidates(result, sortMode);
  const legal = ordered.filter((candidate) => candidate.status === 'legal');
  const pending = ordered.filter((candidate) => candidate.status === 'pending-context');
  const structural = ordered.filter((candidate) => candidate.status === 'structural-only');

  return (
    <div className="ready-wait-groups">
      <section aria-labelledby="legal-waits-title">
        <h4 id="legal-waits-title">合法待胡牌（{legal.length}）</h4>
        {legal.length === 0 ? (
          <p>当前没有合法待胡牌。</p>
        ) : (
          <ul className="ready-wait-list">
            {legal.map((candidate) => (
              <LegalWaitTile candidate={candidate} key={candidate.tile} />
            ))}
          </ul>
        )}
      </section>

      {pending.length > 0 && (
        <section aria-labelledby="pending-waits-title">
          <h4 id="pending-waits-title">待补条件（{pending.length}）</h4>
          <ul className="ready-compact-list">
            {pending.map((candidate) => (
              <li key={candidate.tile} data-wait-status="pending-context">
                <TileFace tile={candidate.tile} />
                {getTileMetadata(candidate.tile).chineseName}：补齐必填和牌条件后再判定
              </li>
            ))}
          </ul>
        </section>
      )}

      {structural.length > 0 && (
        <section aria-labelledby="structural-waits-title">
          <h4 id="structural-waits-title">仅结构可和（{structural.length}）</h4>
          <ul className="ready-compact-list">
            {structural.map((candidate) => (
              <li key={candidate.tile} data-wait-status="structural-only">
                <TileFace tile={candidate.tile} />
                {getTileMetadata(candidate.tile).chineseName}：{structuralReason(candidate)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ModeDifferences({
  primary,
  alternate,
  primaryMode,
  alternateMode,
}: Readonly<{
  primary: WaitAnalysisResult;
  alternate: WaitAnalysisResult;
  primaryMode: WinMode;
  alternateMode: WinMode;
}>) {
  const primaryByTile = new Map(primary.candidates.map((candidate) => [candidate.tile, candidate]));
  const alternateByTile = new Map(
    alternate.candidates.map((candidate) => [candidate.tile, candidate]),
  );
  const changedTiles = [...new Set([...primaryByTile.keys(), ...alternateByTile.keys()])]
    .filter(
      (tile) =>
        candidateSignature(primaryByTile.get(tile)) !==
        candidateSignature(alternateByTile.get(tile)),
    )
    .sort((left, right) => getTileMetadata(left).sortIndex - getTileMetadata(right).sortIndex);

  if (changedTiles.length === 0) return <p>另一和牌方式没有结果差异。</p>;

  return (
    <details className="ready-mode-differences">
      <summary>
        查看{modeLabel(primaryMode)}与{modeLabel(alternateMode)}差异（{changedTiles.length} 张）
      </summary>
      <ul className="ready-compact-list">
        {changedTiles.map((tile) => {
          const primaryCandidate = primaryByTile.get(tile);
          const alternateCandidate = alternateByTile.get(tile);
          return (
            <li key={tile}>
              <TileFace tile={tile} />
              {getTileMetadata(tile).chineseName}：{modeLabel(primaryMode)}{' '}
              {candidateDescription(primaryCandidate)}；{modeLabel(alternateMode)}{' '}
              {candidateDescription(alternateCandidate)}
            </li>
          );
        })}
      </ul>
    </details>
  );
}

export function ReadyAnalysisPanel({
  availableKind,
  status,
  result,
  sortMode,
  selectedDiscard,
  onAnalyze,
  onCancel,
  onSelectDiscard,
}: ReadyAnalysisPanelProps) {
  if (availableKind === null && result === null) return null;

  const isCurrentResult = result !== null;
  let primaryWaits: WaitAnalysisResult | null = null;
  let alternateWaits: WaitAnalysisResult | null = null;
  const orderedDiscards =
    result?.kind === 'discard-to-ready'
      ? sortDiscardCandidates(result.primary.candidates, sortMode)
      : [];

  if (result?.kind === 'wait-analysis') {
    primaryWaits = result.primary;
    alternateWaits = result.alternate;
  } else if (result?.kind === 'discard-to-ready') {
    const activeDiscard = selectedDiscard ?? orderedDiscards[0]?.discard ?? null;
    primaryWaits =
      result.primary.candidates.find(({ discard }) => discard === activeDiscard)?.waits ?? null;
    alternateWaits = result.alternate.candidates.find(({ discard }) => discard === activeDiscard)
      ?.waits ?? {
      candidates: [],
      legalWaitCount: 0,
    };
  }

  return (
    <section className="calculator-panel ready-analysis" aria-labelledby="ready-analysis-title">
      <div className="calculator-panel__heading">
        <div>
          <p className="section-kicker">完整规则计算</p>
          <h2 id="ready-analysis-title">
            {result?.kind === 'discard-to-ready' || availableKind === 'discard-to-ready'
              ? '打哪张后听牌'
              : '听牌分析'}
          </h2>
        </div>
        {status === 'analyzing' ? (
          <button className="secondary-action" type="button" onClick={onCancel}>
            取消分析
          </button>
        ) : (
          <button className="primary-action" type="button" onClick={onAnalyze}>
            {isCurrentResult ? '重新分析' : '开始分析'}
          </button>
        )}
      </div>

      {status === 'error' && <p role="alert">本次听牌分析失败，请检查牌面后重试。</p>}
      {result?.kind === 'discard-to-ready' && (
        <div className="ready-discard-options" aria-label="弃牌方案">
          {orderedDiscards.map(({ discard, waits }) => (
            <button
              className="secondary-action"
              type="button"
              key={discard}
              aria-pressed={(selectedDiscard ?? orderedDiscards[0]?.discard) === discard}
              onClick={() => onSelectDiscard(discard)}
            >
              打{getTileMetadata(discard).chineseName} · {waits.legalWaitCount} 口
            </button>
          ))}
        </div>
      )}

      {primaryWaits !== null && alternateWaits !== null && result !== null && (
        <>
          <p className="ready-primary-mode">
            当前主结果：<strong>{modeLabel(result.primaryMode)}</strong>；排序：
            {sortMode === 'highest-score' ? '高番优先' : '听口优先'}
          </p>
          <WaitList result={primaryWaits} sortMode={sortMode} />
          <ModeDifferences
            primary={primaryWaits}
            alternate={alternateWaits}
            primaryMode={result.primaryMode}
            alternateMode={result.alternateMode}
          />
        </>
      )}
    </section>
  );
}
