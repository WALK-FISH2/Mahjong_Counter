import { useRef } from 'react';

import type {
  CalculatorCorrectionIssue,
  CalculatorCorrectionSource,
} from '../../application/calculator/calculator-store';
import { getTileMetadata } from '../../domain/mahjong';

export type CorrectionStatusPanelProps = Readonly<{
  issues: readonly CalculatorCorrectionIssue[];
  onClearIssue: (issueId: string) => void;
}>;

function locationLabel(issue: CalculatorCorrectionSource): string {
  if (issue.reasonCode === 'RULE_CONTEXT_NOT_AVAILABLE') return `条件 ${issue.data.contextId}`;
  if (issue.reasonCode === 'RULE_FLOWERS_NOT_SUPPORTED') {
    return `花牌第 ${issue.data.flowerIndex + 1} 张`;
  }
  if (!('location' in issue.data)) {
    if ('meldId' in issue.data) return `副露 ${issue.data.meldId}`;
    if ('tile' in issue.data) return getTileMetadata(issue.data.tile).chineseName;
    return '当前牌面';
  }
  const location = issue.data.location;
  switch (location.area) {
    case 'concealed':
      return `手牌第 ${location.index + 1} 张`;
    case 'winning-tile':
      return '胡牌张';
    case 'flowers':
      return `花牌第 ${location.index + 1} 张`;
    case 'meld':
      return `副露 ${location.meldId}`;
  }
}

function issueMessage(issue: CalculatorCorrectionSource): string {
  switch (issue.reasonCode) {
    case 'TILE_NOT_ENABLED':
      return '该牌不属于当前规则启用牌集。';
    case 'TILE_COPY_LIMIT_EXCEEDED':
      return `该牌已录入 ${issue.data.actual} 张，超过上限 ${issue.data.maximum} 张。`;
    case 'FLOWER_IN_STRUCTURAL_AREA':
      return '花牌不能位于手牌、胡牌张或副露结构中。';
    case 'NON_FLOWER_IN_FLOWER_AREA':
      return '普通牌不能位于花牌区域。';
    case 'INVALID_CHOW':
      return '该吃牌组不是当前规则允许的同花色连续三张。';
    case 'EMPTY_MELD_ID':
      return '该副露缺少稳定标识。';
    case 'DUPLICATE_MELD_ID':
      return '牌面中存在重复的副露标识。';
    case 'RULE_MELD_TYPE_NOT_ALLOWED':
      return '该副露类型不属于当前规则允许范围。';
    case 'RULE_MELD_LIMIT_EXCEEDED':
      return '该副露超过当前规则允许的组数上限。';
    case 'RULE_OPEN_KONG_KIND_NOT_ALLOWED':
      return '该明杠类型不属于当前规则允许范围。';
    case 'RULE_FLOWERS_NOT_SUPPORTED':
      return '当前规则不支持花牌。';
    case 'RULE_CONTEXT_NOT_AVAILABLE':
      return '该和牌条件不属于当前规则。';
  }
}

export function CorrectionStatusPanel({ issues, onClearIssue }: CorrectionStatusPanelProps) {
  const issueElements = useRef(new Map<string, HTMLLIElement>());
  if (issues.length === 0) return null;

  return (
    <section className="calculator-panel correction-panel" aria-labelledby="correction-title">
      <p className="section-kicker">需要修正</p>
      <h2 id="correction-title">牌面存在 {issues.length} 个问题</h2>
      <p role="alert">输入已原样保留；修正前不能开始正式分析。</p>
      <ul className="correction-panel__list">
        {issues.map((issue) => (
          <li
            key={issue.issueId}
            ref={(element) => {
              if (element === null) issueElements.current.delete(issue.issueId);
              else issueElements.current.set(issue.issueId, element);
            }}
            tabIndex={-1}
          >
            <strong>{locationLabel(issue.issue)}</strong>
            <span>{issueMessage(issue.issue)}</span>
            <div className="correction-panel__actions">
              <button
                type="button"
                className="secondary-action"
                onClick={() => issueElements.current.get(issue.issueId)?.focus()}
              >
                定位问题
              </button>
              <button
                type="button"
                className="danger-action"
                onClick={() => onClearIssue(issue.issueId)}
              >
                清除异常内容
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
