import { useEffect, useMemo, useState } from 'react';

import { createRulePickerGroups } from '../../application/rules/rule-picker';
import type { RuleCatalogEntry, RuleRepository } from '../../application/rules/rule-repository';
import {
  DEFAULT_CALCULATOR_PREFERENCES,
  type CalculatorPreferences,
  type CalculatorPreferencesPort,
} from '../../application/preferences';
import type { RuleRef } from '../../domain/mahjong/calculator-document';

const STATUS_LABELS = {
  development: '开发中',
  test: '测试版',
  full: '已完整支持',
} as const;

export type RulePickerDialogProps = Readonly<{
  ruleRepository: RuleRepository;
  preferencesPort: CalculatorPreferencesPort;
  currentRuleRef: RuleRef;
  onSelect: (entry: RuleCatalogEntry) => void;
  onClose: () => void;
}>;

export function RulePickerDialog({
  ruleRepository,
  preferencesPort,
  currentRuleRef,
  onSelect,
  onClose,
}: RulePickerDialogProps) {
  const [catalog, setCatalog] = useState<readonly RuleCatalogEntry[]>([]);
  const [preferences, setPreferences] = useState<CalculatorPreferences>(
    DEFAULT_CALCULATOR_PREFERENCES,
  );
  const [query, setQuery] = useState('');
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([ruleRepository.listRuleCatalog(), preferencesPort.read()]).then(
      ([nextCatalog, nextPreferences]) => {
        if (!active) return;
        setCatalog(nextCatalog);
        setPreferences(nextPreferences);
      },
      () => {
        if (active) setLoadFailed(true);
      },
    );
    return () => {
      active = false;
    };
  }, [preferencesPort, ruleRepository]);

  const groups = useMemo(
    () => createRulePickerGroups(catalog, preferences, query),
    [catalog, preferences, query],
  );

  return (
    <div className="dialog-backdrop">
      <section
        className="calculator-dialog rule-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rule-picker-title"
      >
        <div className="calculator-panel__heading">
          <div>
            <p className="section-kicker">规则数据驱动</p>
            <h2 id="rule-picker-title">选择规则</h2>
          </div>
          <button className="secondary-action" type="button" onClick={onClose}>
            关闭
          </button>
        </div>
        <label className="rule-picker__search">
          搜索名称或别名
          <input value={query} onChange={(event) => setQuery(event.currentTarget.value)} />
        </label>
        {loadFailed && <p role="alert">规则列表加载失败，请稍后重试。</p>}
        {!loadFailed && groups.length === 0 && <p>没有匹配的规则。</p>}
        <div className="rule-picker__groups">
          {groups.map((group) => (
            <section key={group.groupId} aria-label={`规则分组 ${group.groupId}`}>
              <h3>{group.groupId}</h3>
              <div className="rule-picker__items">
                {group.items.map((item) => {
                  const selected =
                    item.manifest.ruleId === currentRuleRef.ruleId &&
                    item.manifest.ruleVersion === currentRuleRef.ruleVersion;
                  return (
                    <article
                      className="rule-picker__item"
                      key={`${item.manifest.ruleId}@${item.manifest.ruleVersion}`}
                    >
                      <strong>{item.manifest.displayName}</strong>
                      <span>
                        {STATUS_LABELS[item.manifest.status]} · v{item.manifest.ruleVersion}
                      </span>
                      {item.aliases.length > 0 && <span>别名：{item.aliases.join('、')}</span>}
                      <div className="rule-picker__badges">
                        {item.recentIndex !== null && <span>最近使用</span>}
                        {item.manifest.recommended && <span>推荐</span>}
                      </div>
                      <button
                        className="primary-action"
                        type="button"
                        disabled={!item.canCalculate || selected}
                        onClick={() => onSelect(item)}
                      >
                        {selected ? '当前规则' : item.canCalculate ? '使用此规则' : '仅可查看'}
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </section>
    </div>
  );
}
