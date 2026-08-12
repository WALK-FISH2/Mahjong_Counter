import type { RuleCatalogEntry } from '../../application/rules/rule-repository';

export function TestingRuleConfirmationDialog({
  rule,
  onConfirm,
  onCancel,
}: Readonly<{ rule: RuleCatalogEntry; onConfirm: () => void; onCancel: () => void }>) {
  return (
    <div className="dialog-backdrop">
      <section
        className="calculator-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="testing-rule-title"
      >
        <h2 id="testing-rule-title">确认使用测试版规则</h2>
        <p>
          {rule.manifest.displayName} v{rule.manifest.ruleVersion}{' '}
          仍为测试版。计算、保存、复制和分享必须持续标注该状态与版本。
        </p>
        <div className="dialog-actions">
          <button type="button" className="primary-action" onClick={onConfirm}>
            确认并继续
          </button>
          <button type="button" className="secondary-action" onClick={onCancel}>
            取消
          </button>
        </div>
      </section>
    </div>
  );
}
