import { useStore } from 'zustand';
import type { CalculatorRuntime } from '../../app/bootstrap/calculator-bootstrap';

export function PersistencePanel({
  persistence,
}: Readonly<{ persistence: NonNullable<CalculatorRuntime['persistence']> }>) {
  const { drafts, storage, history } = persistence;
  const session = useStore(drafts.state);
  const mode = useStore(storage.state, (value) => value.mode);
  const reason = useStore(storage.state, (value) => value.reason);
  const commands = useStore(history.state);
  return (
    <aside className="persistence-panel" aria-label="本地数据与编辑状态">
      {mode === 'temporary' ? (
        <div role="status">
          <strong>临时使用模式</strong>
          <p>
            本地存储不可用或空间不足。仍可录牌和计算；保存牌例、草稿恢复和持久化写入已暂停。不要关闭尚未保留的输入。
            空间紧张时建议先备份或明确删除不需要的数据，不会自动清理牌例。
          </p>
          {reason?.startsWith('MIGRATION') === true || reason === 'DATABASE_NEWER_READ_ONLY' ? (
            <p>
              数据库迁移未能可靠完成，原数据与已有备份只读保留。请使用兼容版本处理，不会自动重试写入。
            </p>
          ) : null}
          <button
            className="secondary-action"
            onClick={() => {
              void drafts.recheckStorage();
            }}
          >
            重新检测存储
          </button>
        </div>
      ) : (
        <p role="status">{session.savedAt === null ? '草稿待保存' : '草稿已保存'}</p>
      )}
      {session.role === 'read-only' && (
        <div role="status">
          <p>已在另一窗口编辑；当前计算器只读，未保存输入仍保留在本窗口。</p>
          <button
            className="primary-action"
            onClick={() => {
              void drafts.takeover();
            }}
          >
            在此窗口继续编辑
          </button>
        </div>
      )}
      {session.pending !== null && session.role === 'primary' && mode === 'persistent' && (
        <section aria-label="恢复当前草稿">
          <p>发现上次牌面。请选择继续上次牌面，或明确放弃该草稿并新建。</p>
          <button
            className="primary-action"
            onClick={() => {
              void drafts.continueDraft();
            }}
          >
            继续上次牌面
          </button>
          <button
            className="secondary-action"
            onClick={() => {
              void drafts.newDraft();
            }}
          >
            放弃草稿并新建
          </button>
        </section>
      )}
      {session.error !== null && session.error !== 'EDITOR_READ_ONLY' && mode !== 'temporary' && (
        <p role="alert">
          草稿恢复或写入未完成，原始数据已保留。请检查规则版本或重新打开；未静默覆盖。
        </p>
      )}
      <div className="dialog-actions">
        <button
          className="secondary-action"
          disabled={!drafts.canEdit() || !commands.canUndo}
          onClick={() => history.undo()}
        >
          撤销操作
        </button>
        <button
          className="secondary-action"
          disabled={!drafts.canEdit() || !commands.canRedo}
          onClick={() => history.redo()}
        >
          重做操作
        </button>
      </div>
    </aside>
  );
}
