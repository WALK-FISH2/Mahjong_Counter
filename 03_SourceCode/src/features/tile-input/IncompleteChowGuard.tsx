export type IncompleteChowGuardProps = Readonly<{
  onContinue: () => void;
  onAbandon: () => void;
  onStay: () => void;
}>;

export function IncompleteChowGuard({ onContinue, onAbandon, onStay }: IncompleteChowGuardProps) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <section
        className="calculator-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="incomplete-chow-title"
      >
        <h2 id="incomplete-chow-title">吃牌尚未完成</h2>
        <p>临时选择还没有写入正式牌面。请决定如何处理本次吃牌。</p>
        <div className="calculator-dialog__actions">
          <button className="primary-action" type="button" onClick={onContinue}>
            继续完成吃牌
          </button>
          <button className="danger-action" type="button" onClick={onAbandon}>
            放弃本次吃牌
          </button>
          <button className="secondary-action" type="button" onClick={onStay}>
            留在当前录入流程
          </button>
        </div>
      </section>
    </div>
  );
}
