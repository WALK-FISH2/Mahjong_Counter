import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { SavedExampleService } from '../../application/examples';
import type { TrashExampleRecord } from '../../application/persistence/persistence-models';
import { ExampleDialog } from '../../features/saved-examples/SaveExampleDialog';
import { savedErrorMessage } from '../../features/saved-examples/saved-error-message';

export function TrashExamplesPage({
  service,
}: Readonly<{ service?: SavedExampleService | undefined }>) {
  const [entries, setEntries] = useState<Awaited<ReturnType<SavedExampleService['listTrash']>>>([]);
  const [pending, setPending] = useState<TrashExampleRecord | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void service?.listTrash().then(
      (value) => {
        if (active) setEntries(value);
      },
      (reason: unknown) => {
        if (active) setError(savedErrorMessage(reason));
      },
    );
    return () => {
      active = false;
    };
  }, [service, refresh]);
  const complete = () => {
    setPending(null);
    setRefresh((value) => value + 1);
  };
  const fail = (reason: unknown) => setError(savedErrorMessage(reason));
  return (
    <section className="page-shell">
      <h1>回收站</h1>
      <Link to="/saved">返回牌例列表</Link>
      <p>回收站不会自动过期。移入或恢复不改变牌例的最后修改时间。永久删除不可恢复。</p>
      {error !== null && <p role="alert">{error}</p>}
      {entries.length === 0 && <p>回收站为空。</p>}
      <ul className="saved-list">
        {entries.map((entry) =>
          entry.status === 'unreadable' ? (
            <li key={entry.id}>记录 {entry.id} 暂不可读取，原始数据已保留。</li>
          ) : (
            <li key={entry.record.id}>
              <h2>{entry.record.name}</h2>
              <time dateTime={entry.record.modifiedAt}>
                {new Date(entry.record.modifiedAt).toLocaleString('zh-CN')}
              </time>
              <button
                className="secondary-action"
                onClick={() => {
                  void service?.restoreTrash(entry.record).then(complete, fail);
                }}
              >
                恢复牌例
              </button>
              <button className="danger-action" onClick={() => setPending(entry.record)}>
                永久删除
              </button>
            </li>
          ),
        )}
      </ul>
      {pending !== null && (
        <ExampleDialog title="永久删除此牌例？" onClose={() => setPending(null)}>
          <p>将永久删除“{pending.name}”，此操作不可恢复。</p>
          <button
            className="danger-action"
            onClick={() => {
              void service?.permanentlyDelete(pending, () => true).then(complete, fail);
            }}
          >
            确认永久删除
          </button>
          <button className="secondary-action" onClick={() => setPending(null)}>
            取消
          </button>
        </ExampleDialog>
      )}
    </section>
  );
}
