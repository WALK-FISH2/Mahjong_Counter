import type { RuleCatalogEntry } from '../../application/rules/rule-repository';
import type { RuleSwitchCompatibilityMode } from '../../application/calculator/replace-calculator';

export type RuleSwitchDialogProps = Readonly<{
  target: RuleCatalogEntry;
  onChoose: (mode: RuleSwitchCompatibilityMode) => void;
  onCancel: () => void;
}>;

export function RuleSwitchDialog({ target, onChoose, onCancel }: RuleSwitchDialogProps) {
  return (
    <div className="dialog-backdrop">
      <section
        className="calculator-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rule-switch-title"
      >
        <h2 id="rule-switch-title">切换到 {target.manifest.displayName}</h2>
        <p>当前牌面将按你选择的兼容路径处理；系统不会静默删除或覆盖输入。</p>
        <div className="dialog-actions dialog-actions--stacked">
          <button
            type="button"
            className="primary-action"
            onClick={() => onChoose('remove-incompatible')}
          >
            保留兼容并移除不兼容
          </button>
          <button
            type="button"
            className="secondary-action"
            onClick={() => onChoose('preserve-and-correct')}
          >
            保留全部并待修正
          </button>
          <button type="button" className="danger-action" onClick={() => onChoose('clear')}>
            清空重来
          </button>
          <button type="button" className="secondary-action" onClick={onCancel}>
            取消
          </button>
        </div>
      </section>
    </div>
  );
}
