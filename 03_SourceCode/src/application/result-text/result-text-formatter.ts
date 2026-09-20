import { getTileMetadata, type HandSnapshot, type TileCode } from '../../domain/mahjong';
import type { SavedResultSnapshot } from '../examples/persistence-models';
import type { ReadyAnalysisOutcome } from '../ready-analysis';
import type { WaitAnalysisResult } from '../../domain/engine/ready-analysis';
import type {
  ShareLayer,
  SharePayloadV1,
  ShareRuleInfo,
  ShareableCalculatorState,
} from '../share/share-models';
import { getTileSymbol } from './tile-symbol';

export type TextFormat = 'simple' | 'detailed';
export const SHARE_LAYER_LABELS = {
  preset: '系统预设结果',
  'session-rule': '本次规则结果',
  'user-adjusted': '用户调整结果',
} as const;
export function tileGroupText(tiles: readonly TileCode[]): string {
  return tiles.length === 0
    ? '无'
    : `${tiles.map(getTileSymbol).join(' ')}（${tiles.map((t) => getTileMetadata(t).chineseName).join(' ')}）`;
}
export function formatHandText(hand: HandSnapshot): string {
  return [
    `手牌：${tileGroupText(hand.concealed)}`,
    ...hand.melds.map((m) =>
      m.type === 'chow'
        ? `吃：${tileGroupText(m.tiles)}`
        : m.type === 'pung'
          ? `碰：${tileGroupText([m.tile, m.tile, m.tile])}`
          : `${m.exposure === 'concealed' ? '暗杠' : `明杠${m.openKind === undefined ? '' : m.openKind === 'added' ? '（加杠）' : '（直杠）'}`}：${tileGroupText([m.tile, m.tile, m.tile, m.tile])}`,
    ),
    `花牌：${tileGroupText(hand.flowers)}`,
    `胡牌张：${tileGroupText(hand.winningTile === null ? [] : [hand.winningTile])}`,
  ].join('\n');
}
function heading(
  calculator: ShareableCalculatorState,
  rule: ShareRuleInfo,
  layer: ShareLayer,
): string[] {
  return [
    `${rule.name} @ ${calculator.ruleRef.ruleVersion}${rule.status === 'test' ? ' [TESTING]' : ' [FULL]'}`,
    SHARE_LAYER_LABELS[layer],
    '仅供规则讨论；外部快照不是本地验证结果。',
    ...(rule.status === 'test' ? ['警告：测试版规则，请核对规则说明与已知限制。'] : []),
    formatHandText(calculator.hand),
  ];
}
export function formatEvaluationText(
  input: Readonly<{
    calculator: ShareableCalculatorState;
    rule: ShareRuleInfo;
    snapshot: SavedResultSnapshot;
    layer: ShareLayer;
    candidateId: string | null;
  }>,
  format: TextFormat,
): string {
  const { calculator, rule, snapshot: s, layer } = input;
  const evaluation = layer === 'preset' ? s.presetResult : (s.sessionRuleResult ?? s.presetResult);
  // Match the result panel's display selection. Illegal results have no selected legal ID;
  // their first explanatory candidate is a display fallback, not an engine search shortcut.
  const candidate =
    evaluation.candidates.find((c) => c.candidateId === input.candidateId) ??
    evaluation.candidates.find((c) => c.candidateId === evaluation.selectedCandidateId) ??
    evaluation.candidates[0];
  const display =
    layer === 'preset' ? s.display.preset : (s.display.sessionRule ?? s.display.preset);
  const name = (id: string) => display.patterns.find((p) => p.patternId === id)?.name ?? id;
  const adjusted = layer === 'user-adjusted' ? s.userAdjustedResult?.result : undefined;
  const lines = heading(calculator, rule, layer);
  lines.push(
    `状态：${{ 'legal-win': '合法胡牌', 'not-winning': '不能胡牌', 'structural-win-but-illegal': '结构成立但不满足合法性', 'incomplete-context': '条件未补全，不允许正式分享' }[evaluation.status]}`,
  );
  if (candidate !== undefined) {
    lines.push(`总计：${adjusted?.score.total ?? candidate.score.total} ${display.scoring.unit}`);
    const counted =
      adjusted === undefined
        ? candidate.relation.counted.map((p) => p.candidate.patternId)
        : adjusted.patterns
            .filter((p) => p.displayStatus === 'COUNTED')
            .map((p) => p.resolved.candidate.patternId);
    lines.push(`计入番型：${counted.map(name).join('、') || '无'}`);
  }
  if (calculator.temporaryRuleAdjustment !== null)
    lines.push(`临时规则调整：${JSON.stringify(calculator.temporaryRuleAdjustment.values)}`);
  if (calculator.fanAdjustments.length > 0)
    lines.push(`番型人工调整：${JSON.stringify(calculator.fanAdjustments)}`);
  if (format === 'detailed') {
    lines.push(
      `Engine：${rule.engineVersion}`,
      `条件：${calculator.context.mode} ${JSON.stringify(calculator.context.values)}`,
    );
    if (candidate !== undefined) {
      lines.push(`拆分与胡牌张落点：${JSON.stringify(candidate.placed)}`);
      for (const p of candidate.relation.all)
        lines.push(`${name(p.candidate.patternId)}：${p.status}；${JSON.stringify(p)}`);
      lines.push(
        `计分：${JSON.stringify(adjusted?.score ?? candidate.score)}`,
        `基础合法性：${JSON.stringify(candidate.legality)}`,
        `Explanation：${JSON.stringify(candidate.explanation)}`,
      );
    }
    if (adjusted !== undefined) lines.push(`用户调整详情：${JSON.stringify(adjusted)}`);
    lines.push(
      `规则来源：${JSON.stringify(display.sources)}`,
      ...s.display.warnings.map((w) => `警告：${w}`),
    );
  }
  return lines.join('\n');
}
function waitLines(waits: WaitAnalysisResult): string[] {
  return waits.candidates.map(
    (c) =>
      `${tileGroupText([c.tile])}：${c.status}${c.status === 'legal' ? ` ${c.best.score.total}，${c.highestLegalCandidates.length} 个并列最高结果` : c.status === 'pending-context' ? '，条件待补，不是已确认合法听牌' : '，仅结构成立，不是合法听牌'}`,
  );
}
function readyLines(outcome: ReadyAnalysisOutcome): string[] {
  return [
    outcome.primaryMode,
    ...(outcome.kind === 'wait-analysis'
      ? waitLines(outcome.primary)
      : outcome.primary.candidates.flatMap((c) => [
          `打出 ${tileGroupText([c.discard])}`,
          ...waitLines(c.waits),
        ])),
    outcome.alternateMode,
    ...(outcome.kind === 'wait-analysis'
      ? waitLines(outcome.alternate)
      : outcome.alternate.candidates.flatMap((c) => [
          `打出 ${tileGroupText([c.discard])}`,
          ...waitLines(c.waits),
        ])),
  ];
}
export function formatShareText(payload: SharePayloadV1, format: TextFormat): string {
  const r = payload.resultSnapshot;
  if (r.kind === 'evaluation')
    return formatEvaluationText(
      {
        calculator: payload.calculator,
        rule: payload.rule,
        snapshot: r.value,
        layer: payload.view.layer,
        candidateId: payload.view.candidateId,
      },
      format,
    );
  const outcome = payload.view.layer === 'preset' ? r.preset : (r.sessionRule ?? r.preset);
  return [
    ...heading(payload.calculator, payload.rule, payload.view.layer),
    `听牌分析：${outcome.kind}`,
    ...(r.mode === 'ignore-winning-tile' ? ['独立分析：忽略原胡牌张标记，原始牌面保持不变'] : []),
    ...readyLines(outcome),
    ...(payload.calculator.temporaryRuleAdjustment === null
      ? []
      : [`临时规则调整：${JSON.stringify(payload.calculator.temporaryRuleAdjustment.values)}`]),
    ...(format === 'detailed'
      ? [
          `Engine：${payload.rule.engineVersion}`,
          `条件：${JSON.stringify(payload.calculator.context)}`,
          `候选与 Explanation：${JSON.stringify(outcome)}`,
        ]
      : []),
  ].join('\n');
}
