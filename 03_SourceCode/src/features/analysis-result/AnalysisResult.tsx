import type { CandidateResult, SystemEvaluation } from '../../domain/engine/evaluation';
import {
  FORCE_INCLUDE_REASONS,
  type FanAdjustmentState,
  type EvaluationLayer,
  type UserAdjustedPattern,
  type UserAdjustedScore,
} from '../../domain/engine/adjustment';
import type { ResultActionPolicy } from '../../application/calculator/result-action-policy';
import type { ExplanationNode } from '../../domain/engine/explanation';
import type { Meld } from '../../domain/mahjong/meld';
import type { HandSnapshot } from '../../domain/mahjong/hand';
import { getTileMetadata, type TileCode } from '../../domain/mahjong/tile';
import type { RulePackageDefinition } from '../../domain/rules/rule-package';
import { TileFace } from '../tile-input/TileFace';

export type AnalysisResultProps = Readonly<{
  result: SystemEvaluation;
  selectedCandidateId: string | null;
  rulePackage: RulePackageDefinition;
  originalHand: HandSnapshot;
  onSelectCandidate: (candidateId: string) => void;
  onOpenAdjustments: () => void;
  activeLayer?: EvaluationLayer;
  availableLayers?: readonly EvaluationLayer[];
  userAdjustedResult?: UserAdjustedScore | null;
  actionPolicy?: ResultActionPolicy;
  onSelectLayer?: (layer: EvaluationLayer) => void;
  onApplyFanAdjustment?: (patternId: string, action: 'exclude' | 'force-include') => void;
  onClearFanAdjustment?: (patternId: string) => void;
}>;

const RELATION_REASON_LABELS: Readonly<Record<string, string>> = Object.freeze({
  COVERED: '已被更高层番型覆盖',
  MUTEX: '与已计入番型互斥',
  NON_REPEAT: '按规则不可重复累计',
  HIGHER_SELECTED: '同组仅计较高番值',
  SAME_SET_ALREADY_USED: '同一组牌已用于其他番型',
  FALLBACK_NOT_APPLICABLE: '已有其他番型，兜底番型不适用',
});

function Tile({ tile, winning = false }: Readonly<{ tile: TileCode; winning?: boolean }>) {
  return (
    <span
      className={winning ? 'result-tile result-tile--winning' : 'result-tile'}
      aria-label={`${getTileMetadata(tile).chineseName}${winning ? '，胡牌张' : ''}`}
    >
      <TileFace tile={tile} />
    </span>
  );
}

function MeldTiles({ meld }: Readonly<{ meld: Meld }>) {
  const tiles: readonly TileCode[] =
    meld.type === 'chow'
      ? meld.tiles
      : Array.from({ length: meld.type === 'pung' ? 3 : 4 }, () => meld.tile);
  return (
    <>
      {tiles.map((tile, index) => (
        <Tile key={`${tile}-${index}`} tile={tile} />
      ))}
    </>
  );
}

function ArrangedHand({ candidate }: Readonly<{ candidate: CandidateResult }>) {
  const { decomposition } = candidate.placed;
  const placement = candidate.placed.winningTilePlacement;

  return (
    <section className="result-block" aria-labelledby="arranged-hand-title">
      <h3 id="arranged-hand-title">当前最高结果牌型</h3>
      <div className="arranged-hand" data-structure-key={decomposition.structureKey}>
        {decomposition.structureKey === 'standard-meld-pair' && (
          <>
            {decomposition.declaredMelds.map((meld) => (
              <span className="arranged-hand__group" key={meld.id} data-group-kind="declared">
                <MeldTiles meld={meld} />
              </span>
            ))}
            {decomposition.concealedMelds.map((meld, meldIndex) => (
              <span
                className="arranged-hand__group"
                key={`${meld.kind}-${meldIndex}`}
                data-group-kind={meld.kind}
              >
                {meld.kind === 'sequence'
                  ? meld.tiles.map((tile, tileIndex) => (
                      <Tile
                        key={`${tile}-${tileIndex}`}
                        tile={tile}
                        winning={
                          placement.kind === 'sequence' &&
                          placement.meldIndex === meldIndex &&
                          placement.tileIndex === tileIndex
                        }
                      />
                    ))
                  : Array.from({ length: 3 }, (_, tileIndex) => (
                      <Tile
                        key={`${meld.tile}-${tileIndex}`}
                        tile={meld.tile}
                        winning={
                          placement.kind === 'triplet' &&
                          placement.meldIndex === meldIndex &&
                          tileIndex === 2
                        }
                      />
                    ))}
              </span>
            ))}
            <span className="arranged-hand__group" data-group-kind="pair">
              <Tile tile={decomposition.pair.tile} />
              <Tile tile={decomposition.pair.tile} winning={placement.kind === 'pair'} />
            </span>
          </>
        )}
        {decomposition.structureKey === 'seven-pairs' &&
          decomposition.pairs.map((tile, pairIndex) => (
            <span className="arranged-hand__group" key={`${tile}-${pairIndex}`}>
              <Tile tile={tile} />
              <Tile
                tile={tile}
                winning={placement.kind === 'seven-pairs-pair' && placement.pairIndex === pairIndex}
              />
            </span>
          ))}
        {decomposition.structureKey === 'thirteen-orphans' &&
          decomposition.requiredTiles.map((tile) => (
            <span className="arranged-hand__group" key={tile}>
              <Tile
                tile={tile}
                winning={placement.kind === 'thirteen-orphans-single' && placement.tile === tile}
              />
              {decomposition.pairTile === tile && (
                <Tile
                  tile={tile}
                  winning={placement.kind === 'thirteen-orphans-pair' && placement.tile === tile}
                />
              )}
            </span>
          ))}
      </div>
      <p className="result-help">高亮牌为本候选拆分中的胡牌张落点。</p>
    </section>
  );
}

function OriginalHand({ hand }: Readonly<{ hand: HandSnapshot }>) {
  return (
    <details className="original-hand">
      <summary>查看原始牌面</summary>
      <div className="arranged-hand" aria-label="原始牌面复核">
        <span className="arranged-hand__group" data-group-kind="concealed">
          {hand.concealed.map((tile, index) => (
            <Tile key={`${tile}-${index}`} tile={tile} />
          ))}
        </span>
        {hand.melds.map((meld) => (
          <span className="arranged-hand__group" key={meld.id} data-group-kind="declared">
            <MeldTiles meld={meld} />
          </span>
        ))}
        {hand.winningTile !== null && (
          <span className="arranged-hand__group" data-group-kind="winning-tile">
            <Tile tile={hand.winningTile} winning />
          </span>
        )}
        {hand.flowers.length > 0 && (
          <span className="arranged-hand__group" data-group-kind="flowers">
            {hand.flowers.map((tile, index) => (
              <Tile key={`${tile}-${index}`} tile={tile} />
            ))}
          </span>
        )}
      </div>
    </details>
  );
}

function PatternSummary({
  candidate,
  rulePackage,
  userAdjustedResult,
  onApplyFanAdjustment,
  onClearFanAdjustment,
}: Readonly<{
  candidate: CandidateResult;
  rulePackage: RulePackageDefinition;
  userAdjustedResult: UserAdjustedScore | null;
  onApplyFanAdjustment:
    ((patternId: string, action: 'exclude' | 'force-include') => void) | undefined;
  onClearFanAdjustment: ((patternId: string) => void) | undefined;
}>) {
  const patterns = new Map(rulePackage.patterns.map((pattern) => [pattern.patternId, pattern]));
  const countedPatterns: readonly UserAdjustedPattern[] =
    userAdjustedResult?.patterns.filter(({ displayStatus }) => displayStatus === 'COUNTED') ??
    candidate.relation.counted.map((resolved) => ({
      resolved,
      displayStatus: 'COUNTED' as const,
    }));
  const excludedPatterns: readonly UserAdjustedPattern[] =
    userAdjustedResult?.patterns.filter(({ displayStatus }) => displayStatus === 'EXCLUDED') ??
    candidate.relation.excluded.map((resolved) => ({
      resolved,
      displayStatus: 'EXCLUDED' as const,
    }));
  const staleAdjustments =
    userAdjustedResult?.adjustmentStates.filter(
      (state): state is Extract<FanAdjustmentState, { status: 'stale' }> =>
        state.status === 'stale',
    ) ?? [];
  const staleReasonLabels: Readonly<Record<string, string>> = Object.freeze({
    PATTERN_NOT_RECOGNIZED: '当前牌面已不再识别该番型',
    TARGET_NOT_COUNTED: '该番型当前已不在计入结果中',
    TARGET_NOT_EXCLUDED: '该番型当前已不在排除结果中',
    CONFLICT_NOT_FORCE_INCLUDEABLE: '当前排除原因不允许强制计入',
    CONFLICT_NOT_CONFIRMED: '当前冲突尚未确认',
    CONFLICT_CHANGED: '冲突关系已变化，需要重新确认',
  });
  const canForceInclude = (reason: string) =>
    FORCE_INCLUDE_REASONS.includes(reason as (typeof FORCE_INCLUDE_REASONS)[number]);

  const adjustmentButton = (
    patternId: string,
    adjustmentAction: 'exclude' | 'force-include' | undefined,
    baseStatus: 'COUNTED' | 'EXCLUDED',
    reason: string,
  ) => {
    if (adjustmentAction !== undefined) {
      return (
        <button
          type="button"
          className="secondary-action"
          onClick={() => onClearFanAdjustment?.(patternId)}
        >
          {adjustmentAction === 'exclude' ? '恢复计入' : '恢复排除'}
        </button>
      );
    }
    if (baseStatus === 'EXCLUDED' && !canForceInclude(reason)) return null;
    return (
      <button
        type="button"
        className="secondary-action"
        onClick={() =>
          onApplyFanAdjustment?.(patternId, baseStatus === 'COUNTED' ? 'exclude' : 'force-include')
        }
      >
        {baseStatus === 'COUNTED' ? '取消计入' : '强制计入'}
      </button>
    );
  };
  return (
    <section className="result-block result-patterns" aria-labelledby="pattern-summary-title">
      <h3 id="pattern-summary-title">番型明细</h3>
      <h4>已计入番型</h4>
      {countedPatterns.length === 0 ? (
        <p>没有计入番型。</p>
      ) : (
        <ul>
          {countedPatterns.map(({ resolved, adjustmentAction }) => {
            const pattern = resolved.candidate;
            return (
              <li key={pattern.patternId}>
                <div>
                  <strong>{patterns.get(pattern.patternId)?.name ?? pattern.patternId}</strong>
                  <span>
                    {patterns.get(pattern.patternId)?.value ?? '—'} {rulePackage.scoring.unit}
                    {pattern.occurrences > 1 ? ` × ${pattern.occurrences}` : ''}
                  </span>
                  {adjustmentAction === 'force-include' && (
                    <span className="fan-adjustment-warning">
                      强制计入（原排除原因：
                      {RELATION_REASON_LABELS[resolved.reason] ?? resolved.reason}）
                    </span>
                  )}
                </div>
                {adjustmentButton(
                  pattern.patternId,
                  adjustmentAction,
                  resolved.status,
                  resolved.reason,
                )}
              </li>
            );
          })}
        </ul>
      )}
      <h4>未计入番型及原因</h4>
      {excludedPatterns.length === 0 ? (
        <p>没有被排除的已识别番型。</p>
      ) : (
        <ul data-testid="excluded-patterns">
          {excludedPatterns.map(({ resolved, adjustmentAction }) => {
            const pattern = resolved.candidate;
            return (
              <li key={pattern.patternId}>
                <div>
                  <strong>{patterns.get(pattern.patternId)?.name ?? pattern.patternId}</strong>
                  <span>
                    {adjustmentAction === 'exclude'
                      ? '用户取消计入'
                      : (RELATION_REASON_LABELS[resolved.reason] ?? resolved.reason)}
                  </span>
                </div>
                {adjustmentButton(
                  pattern.patternId,
                  adjustmentAction,
                  resolved.status,
                  resolved.reason,
                )}
              </li>
            );
          })}
        </ul>
      )}
      {staleAdjustments.length > 0 && (
        <div className="stale-adjustments" role="status">
          <h4>需要重新确认的调整</h4>
          <ul>
            {staleAdjustments.map((state) => (
              <li key={`${state.adjustment.patternId}-${state.adjustment.action}`}>
                <div>
                  <strong>
                    {patterns.get(state.adjustment.patternId)?.name ?? state.adjustment.patternId}
                  </strong>
                  <span>{staleReasonLabels[state.reasonCode] ?? state.reasonCode}</span>
                </div>
                <button
                  type="button"
                  className="secondary-action"
                  onClick={() => onClearFanAdjustment?.(state.adjustment.patternId)}
                >
                  移除失效调整
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function NodeList({
  title,
  nodes,
}: Readonly<{ title: string; nodes: readonly ExplanationNode[] }>) {
  return (
    <section className="explanation-stage">
      <h4>{title}</h4>
      {nodes.length === 0 ? (
        <p>本阶段没有附加记录。</p>
      ) : (
        <ol>
          {nodes.map((node, index) => (
            <li key={`${node.nodeType}-${node.reasonCode}-${index}`}>
              <code>{node.reasonCode}</code>
              <span>{JSON.stringify(node.data)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function Explanation({
  candidate,
  rulePackage,
}: Readonly<{ candidate: CandidateResult; rulePackage: RulePackageDefinition }>) {
  const explanation = candidate.explanation;
  const sources = new Map(rulePackage.sources.map((source) => [source.sourceId, source]));
  return (
    <details className="calculation-explanation">
      <summary>查看完整计算过程</summary>
      <p>
        规则版本：{explanation.ruleRef.ruleId}@{explanation.ruleRef.ruleVersion}
      </p>
      <p className="result-help">计算顺序：结构拆分 → 番型识别 → 番型关系 → 计分 → 合法性。</p>
      <NodeList title="1. 结构拆分与胡牌张落点" nodes={[explanation.structure]} />
      <NodeList title="2. 番型识别" nodes={explanation.patternNodes} />
      <NodeList title="3. 番型关系处理" nodes={explanation.relationNodes} />
      <NodeList title="4. 计分与封顶" nodes={explanation.scoringNodes} />
      <NodeList title="5. 合法性判断" nodes={explanation.legalityNodes} />
      <section className="explanation-stage">
        <h4>规则来源</h4>
        {explanation.sourceRefs.length === 0 ? (
          <p>本候选没有额外来源引用。</p>
        ) : (
          <ul>
            {explanation.sourceRefs.map((sourceRef) => {
              const source = sources.get(sourceRef);
              return (
                <li key={sourceRef}>
                  {source?.url === undefined ? (
                    (source?.title ?? sourceRef)
                  ) : (
                    <a href={source.url} rel="noreferrer" target="_blank">
                      {source.title}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </details>
  );
}

function selectedCandidate(result: SystemEvaluation, selectedCandidateId: string | null) {
  return (
    result.candidates.find(({ candidateId }) => candidateId === selectedCandidateId) ??
    result.candidates.find(({ candidateId }) => candidateId === result.selectedCandidateId) ??
    result.candidates[0] ??
    null
  );
}

function LegalityDetails({ candidate }: Readonly<{ candidate: CandidateResult }>) {
  if (candidate.legality.status === 'legal') return null;
  if (candidate.legality.status === 'incomplete-context') {
    return (
      <section className="result-block" aria-labelledby="incomplete-context-title">
        <h3 id="incomplete-context-title">待补充条件</h3>
        <ul>
          {candidate.legality.missingContextIds.map((contextId) => (
            <li key={contextId}>{contextId}</li>
          ))}
        </ul>
      </section>
    );
  }
  return (
    <section className="result-block" aria-labelledby="illegal-reasons-title">
      <h3 id="illegal-reasons-title">当前不能胡的原因</h3>
      <ul>
        {candidate.legality.reasons.map((reason) => (
          <li key={reason.reasonCode}>
            当前 {reason.data.actualFan} 番，未达到最低 {reason.data.minimumFan} 番。
          </li>
        ))}
      </ul>
    </section>
  );
}

export function AnalysisResult({
  result,
  selectedCandidateId,
  rulePackage,
  originalHand,
  onSelectCandidate,
  onOpenAdjustments,
  activeLayer = 'preset',
  availableLayers = ['preset'],
  userAdjustedResult = null,
  actionPolicy,
  onSelectLayer,
  onApplyFanAdjustment,
  onClearFanAdjustment,
}: AnalysisResultProps) {
  const candidate = selectedCandidate(result, selectedCandidateId);
  const statusContent = {
    'legal-win': ['合法和牌', '当前结果达到本规则的和牌要求。'],
    'structural-win-but-illegal': [
      '结构成和，但按当前规则不能胡',
      '牌型结构成立，但基础合法性未通过。',
    ],
    'not-winning': ['当前不是和牌', '没有找到符合当前规则定义的完整和牌结构。'],
    'incomplete-context': ['和牌条件不完整', '结构已成立，但缺少完成正式判断所需的和牌条件。'],
  } as const;
  const [title, description] = statusContent[result.status];
  const displayScore =
    activeLayer === 'user-adjustment' && userAdjustedResult !== null
      ? userAdjustedResult.score
      : candidate?.score;

  return (
    <div className="analysis-result" data-result-status={result.status}>
      {availableLayers.length > 1 && (
        <nav className="result-layer-switcher" aria-label="结果层级">
          {availableLayers.map((layer) => (
            <button
              type="button"
              className="secondary-action"
              aria-pressed={activeLayer === layer}
              key={layer}
              onClick={() => onSelectLayer?.(layer)}
            >
              {layer === 'preset'
                ? '系统预设结果'
                : layer === 'session-rule'
                  ? '本次规则结果'
                  : '用户调整结果'}
            </button>
          ))}
        </nav>
      )}
      <p className="result-layer-label">
        {activeLayer === 'preset'
          ? '系统预设结果'
          : activeLayer === 'session-rule'
            ? '本次规则结果 · 本次规则已调整'
            : '用户调整结果 · 人工调整不改变基础合法性'}
      </p>
      <h3>{title}</h3>
      <p>{description}</p>
      {result.status === 'legal-win' && displayScore !== undefined && (
        <p className="result-total">
          {activeLayer === 'user-adjustment' && '用户调整合计：'}
          <strong>{displayScore.total}</strong> {displayScore.unit}
        </p>
      )}
      {candidate !== null && result.status !== 'not-winning' && (
        <>
          {result.status === 'legal-win' && result.highestLegalCandidateIds.length > 1 && (
            <fieldset className="tied-candidates">
              <legend>并列最高结果</legend>
              {result.highestLegalCandidateIds.map((candidateId, index) => (
                <button
                  className="secondary-action"
                  type="button"
                  key={candidateId}
                  aria-pressed={candidate.candidateId === candidateId}
                  onClick={() => onSelectCandidate(candidateId)}
                >
                  方案 {index + 1}
                </button>
              ))}
            </fieldset>
          )}
          <ArrangedHand candidate={candidate} />
          <OriginalHand hand={originalHand} />
          <LegalityDetails candidate={candidate} />
          <PatternSummary
            candidate={candidate}
            rulePackage={rulePackage}
            userAdjustedResult={activeLayer === 'user-adjustment' ? userAdjustedResult : null}
            onApplyFanAdjustment={onApplyFanAdjustment}
            onClearFanAdjustment={onClearFanAdjustment}
          />
          <section className="result-block score-breakdown" aria-labelledby="score-breakdown-title">
            <h3 id="score-breakdown-title">计分摘要</h3>
            <dl>
              <div>
                <dt>封顶前</dt>
                <dd>
                  {displayScore?.totalBeforeCap} {displayScore?.unit}
                </dd>
              </div>
              <div>
                <dt>封顶后</dt>
                <dd>
                  {displayScore?.cap.subtotalAfterCap} {displayScore?.unit}
                </dd>
              </div>
              <div>
                <dt>最终合计</dt>
                <dd>
                  {displayScore?.total} {displayScore?.unit}
                </dd>
              </div>
            </dl>
          </section>
          <Explanation candidate={candidate} rulePackage={rulePackage} />
        </>
      )}
      <button className="secondary-action" type="button" onClick={onOpenAdjustments}>
        临时调整本次规则
      </button>
      {actionPolicy !== undefined && (
        <div className="result-actions" aria-label="结果操作">
          {actionPolicy.save && (
            <button type="button" className="primary-action">
              保存牌例
            </button>
          )}
          {actionPolicy.copy && (
            <button type="button" className="secondary-action">
              复制结果
            </button>
          )}
          {actionPolicy.share && (
            <button type="button" className="secondary-action">
              分享链接
            </button>
          )}
        </div>
      )}
    </div>
  );
}
