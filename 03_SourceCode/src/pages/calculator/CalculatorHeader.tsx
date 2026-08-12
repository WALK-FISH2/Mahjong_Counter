import type { CalculatorDocument } from '../../domain/mahjong/calculator-document';
import type { RuleManifest, RuleStatus } from '../../domain/rules/rule-manifest';

const STATUS_LABELS: Readonly<Record<RuleStatus, string>> = Object.freeze({
  development: '开发中',
  test: '测试版',
  full: '已完整支持',
});

export type CalculatorHeaderProps = Readonly<{
  manifest: RuleManifest;
  document: CalculatorDocument;
}>;

export function CalculatorHeader({ manifest, document }: CalculatorHeaderProps) {
  const adjusted = document.temporaryRuleAdjustment !== null;

  return (
    <header className="calculator-header">
      <div className="calculator-header__title">
        <h1 id="calculator-title">算番</h1>
        <div>
          <p className="calculator-header__rule-name">{manifest.displayName}</p>
          <div className="calculator-header__badges" aria-label="当前规则状态">
            <span className={`status-badge status-badge--${manifest.status}`}>
              {STATUS_LABELS[manifest.status]}
            </span>
            <span className="status-badge status-badge--version">v{manifest.ruleVersion}</span>
            {adjusted && (
              <span className="status-badge status-badge--adjusted">本次规则已调整</span>
            )}
          </div>
        </div>
      </div>

      <details className="rule-entry">
        <summary>选择规则</summary>
        <div className="rule-entry__content">
          <p>当前可用于计算</p>
          <strong>{manifest.displayName}</strong>
          <span>
            {STATUS_LABELS[manifest.status]} · v{manifest.ruleVersion}
          </span>
        </div>
      </details>
    </header>
  );
}
