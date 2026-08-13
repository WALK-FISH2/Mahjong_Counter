import { useMemo, useState } from 'react';

import {
  formatQuickCalcText,
  type QuickCalcEvaluator,
  type QuickCalcResult,
} from '../../application/calculator/quick-calc';
import { getResultActionPolicy } from '../../application/calculator/result-action-policy';
import {
  getMissingRequiredContextIds,
  isContextDefinitionApplicable,
} from '../../domain/engine/legality';
import {
  createWinContext,
  setContextValue,
  knownContextValue,
  type KnownContextPrimitive,
  type WinContext,
  type WinMode,
} from '../../domain/mahjong';
import type { RulePackageDefinition } from '../../domain/rules/rule-package';
import { WinContextPanel } from '../win-context/WinContextPanel';

export type QuickCalcPanelProps = Readonly<{
  rulePackage: RulePackageDefinition;
  evaluate: QuickCalcEvaluator;
  onClose: () => void;
}>;

const RELATION_REASON_LABELS: Readonly<Record<string, string>> = Object.freeze({
  COVERED: '被更高层番型覆盖',
  MUTEX: '与已计入番型互斥',
  NON_REPEAT: '按规则不重复累计',
  HIGHER_SELECTED: '同组仅计较高番型',
  SAME_SET_ALREADY_USED: '同一组牌已用于其他番型',
  FALLBACK_NOT_APPLICABLE: '已有其他番型，兜底番型不适用',
});

export function QuickCalcPanel({ rulePackage, evaluate, onClose }: QuickCalcPanelProps) {
  const actionPolicy = getResultActionPolicy('quick-calc');
  const availablePatterns = useMemo(
    () => rulePackage.patterns.filter(({ enabled }) => enabled),
    [rulePackage.patterns],
  );
  const patternNames = useMemo(
    () => new Map(rulePackage.patterns.map(({ patternId, name }) => [patternId, name])),
    [rulePackage.patterns],
  );
  const [selectedPatternIds, setSelectedPatternIds] = useState<readonly string[]>([]);
  const [context, setContext] = useState<WinContext>(() => createWinContext('discard'));
  const [result, setResult] = useState<QuickCalcResult | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'fallback'>('idle');

  const togglePattern = (patternId: string): void => {
    setSelectedPatternIds((current) =>
      current.includes(patternId)
        ? current.filter((candidate) => candidate !== patternId)
        : [...current, patternId],
    );
    setResult(null);
    setCopyState('idle');
  };

  const calculate = (): void => {
    setResult(
      evaluate(rulePackage, {
        ruleRef: {
          ruleId: rulePackage.manifest.ruleId,
          ruleVersion: rulePackage.manifest.ruleVersion,
        },
        selectedPatternIds,
        context,
      }),
    );
    setCopyState('idle');
  };

  const changeMode = (mode: WinMode): void => {
    setContext((current) => {
      const candidate = createWinContext(mode, current.values);
      const values = Object.fromEntries(
        Object.entries(current.values).filter(([contextId]) => {
          const definition = rulePackage.contexts.find((item) => item.contextId === contextId);
          return definition !== undefined && isContextDefinitionApplicable(definition, candidate);
        }),
      );
      return createWinContext(mode, values);
    });
    setResult(null);
    setCopyState('idle');
  };

  const changeContextValue = (contextId: string, value: KnownContextPrimitive): void => {
    setContext((current) => {
      const values = { ...current.values };
      const definition = rulePackage.contexts.find((item) => item.contextId === contextId);
      for (const mutuallyExclusiveId of definition?.mutuallyExclusiveWith ?? []) {
        delete values[mutuallyExclusiveId];
      }
      return setContextValue(
        createWinContext(current.mode, values),
        contextId,
        knownContextValue(value),
      );
    });
    setResult(null);
    setCopyState('idle');
  };

  const clearContextValue = (contextId: string): void => {
    setContext((current) => {
      const values = { ...current.values };
      delete values[contextId];
      return createWinContext(current.mode, values);
    });
    setResult(null);
    setCopyState('idle');
  };

  const copyText = async (): Promise<void> => {
    if (result === null) return;
    const text = formatQuickCalcText(rulePackage, result);
    try {
      if (navigator.clipboard?.writeText === undefined) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      setCopyState('copied');
    } catch {
      setCopyState('fallback');
    }
  };

  return (
    <section className="calculator-panel quick-calc" aria-labelledby="quick-calc-title">
      <header className="quick-calc__header">
        <div>
          <p className="section-kicker">次级工具 · 临时查看</p>
          <h2 id="quick-calc-title">快速算番</h2>
        </div>
        <button type="button" className="secondary-action" onClick={onClose}>
          返回牌面计算
        </button>
      </header>
      <p className="quick-calc__warning" role="note">
        用户选择，未经牌面验证
      </p>
      <p>
        当前规则：{rulePackage.manifest.displayName} · {rulePackage.manifest.ruleId}@
        {rulePackage.manifest.ruleVersion}
      </p>

      <WinContextPanel
        mode={context.mode}
        values={context.values}
        definitions={rulePackage.contexts}
        missingContextIds={getMissingRequiredContextIds(context, rulePackage.contexts)}
        removedContextIds={[]}
        onModeChange={changeMode}
        onValueChange={changeContextValue}
        onValueClear={clearContextValue}
        onUndoModeChange={() => undefined}
      />

      <fieldset className="quick-calc__patterns">
        <legend>手工选择番型</legend>
        <div>
          {availablePatterns.map((pattern) => (
            <label key={pattern.patternId}>
              <input
                type="checkbox"
                checked={selectedPatternIds.includes(pattern.patternId)}
                onChange={() => togglePattern(pattern.patternId)}
              />
              <span>{pattern.name}</span>
              <small>
                {pattern.value} {pattern.unit}
              </small>
            </label>
          ))}
        </div>
      </fieldset>

      <button type="button" className="primary-action" onClick={calculate}>
        计算用户所选番型
      </button>

      {result !== null && (
        <section className="quick-calc__result" aria-labelledby="quick-calc-result-title">
          <p className="quick-calc__warning">用户选择，未经牌面验证</p>
          <h3 id="quick-calc-result-title">临时合计</h3>
          <p className="result-total">
            <strong>{result.score.total}</strong> {result.score.unit}
          </p>
          <p>
            {result.legality.status === 'legal'
              ? '达到当前规则门槛'
              : result.legality.status === 'illegal'
                ? `未达到当前规则最低 ${rulePackage.legality.minimumFan} ${result.score.unit}`
                : '必要上下文不完整，仅供暂定查看'}
          </p>
          <div className="quick-calc__relation">
            <h4>已计入番型</h4>
            {result.relation.counted.length === 0 ? (
              <p>无</p>
            ) : (
              <ul>
                {result.relation.counted.map(({ candidate }) => (
                  <li key={candidate.patternId}>
                    {patternNames.get(candidate.patternId) ?? candidate.patternId}
                  </li>
                ))}
              </ul>
            )}
            <h4>未计入番型及原因</h4>
            {result.relation.excluded.length === 0 ? (
              <p>无</p>
            ) : (
              <ul>
                {result.relation.excluded.map(({ candidate, reason }) => (
                  <li key={candidate.patternId}>
                    {patternNames.get(candidate.patternId) ?? candidate.patternId}：
                    {RELATION_REASON_LABELS[reason] ?? reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="quick-calc__actions" aria-label="快速算番操作">
            {actionPolicy.copy && (
              <button type="button" className="secondary-action" onClick={() => void copyText()}>
                复制文字
              </button>
            )}
          </div>
          {copyState === 'copied' && <p role="status">已复制快速算番文字。</p>}
          {copyState === 'fallback' && (
            <label className="quick-calc__copy-fallback">
              当前浏览器无法直接复制，请手动复制：
              <textarea readOnly value={formatQuickCalcText(rulePackage, result)} />
            </label>
          )}
        </section>
      )}
    </section>
  );
}
