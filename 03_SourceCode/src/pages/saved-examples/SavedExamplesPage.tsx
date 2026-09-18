import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  querySavedExamples,
  type SavedExampleEntry,
  type SavedExampleService,
  type SavedListQuery,
} from '../../application/examples';
import { savedErrorMessage } from '../../features/saved-examples/saved-error-message';

export function SavedExamplesPage({
  service,
}: Readonly<{ service?: SavedExampleService | undefined }>) {
  const [entries, setEntries] = useState<readonly SavedExampleEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [query, setQuery] = useState<SavedListQuery>({
    search: '',
    ruleId: '',
    sort: 'modified-desc',
  });
  useEffect(() => {
    let active = true;
    void service?.list().then(
      (next) => {
        if (active) setEntries(next);
      },
      (reason: unknown) => {
        if (active) setError(savedErrorMessage(reason));
      },
    );
    return () => {
      active = false;
    };
  }, [service, refresh]);
  const records = querySavedExamples(entries ?? [], query);
  const ruleNames = new Map(
    (entries ?? []).flatMap((entry) =>
      entry.status === 'available'
        ? [[entry.record.ruleRef.ruleId, entry.record.resultSnapshot.display.ruleName] as const]
        : [],
    ),
  );
  return (
    <section className="page-shell saved-examples" aria-labelledby="saved-examples-title">
      <h1 id="saved-examples-title">已保存牌例</h1>
      <Link to="/saved/trash">回收站</Link>
      {error !== null && <p role="alert">{error}</p>}
      {entries === null && error === null && <p>正在读取本地牌例…</p>}
      <div className="saved-filters">
        <label>
          名称搜索
          <input
            type="search"
            value={query.search}
            onChange={(event) => setQuery({ ...query, search: event.target.value })}
          />
        </label>
        <label>
          规则筛选
          <select
            value={query.ruleId}
            onChange={(event) => setQuery({ ...query, ruleId: event.target.value })}
          >
            <option value="">全部规则</option>
            {[...ruleNames].map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          排序
          <select
            value={query.sort}
            onChange={(event) => {
              const sort = event.target.value;
              if (sort === 'modified-desc' || sort === 'modified-asc' || sort === 'name')
                setQuery({ ...query, sort });
            }}
          >
            <option value="modified-desc">最后修改时间倒序</option>
            <option value="modified-asc">最后修改时间正序</option>
            <option value="name">名称排序</option>
          </select>
        </label>
      </div>
      {entries !== null && records.length === 0 && <p>没有匹配的已保存牌例。</p>}
      <ul className="saved-list">
        {records.map((record) => (
          <li key={record.id}>
            <Link to={`/saved/${encodeURIComponent(record.id)}`}>{record.name}</Link>
            <p>
              {record.resultSnapshot.display.ruleName} · {record.ruleRef.ruleVersion}
            </p>
            <time dateTime={record.modifiedAt}>
              {new Date(record.modifiedAt).toLocaleString('zh-CN')}
            </time>
            <button
              className="secondary-action"
              onClick={() => {
                void service?.trash(record).then(
                  () => setRefresh((value) => value + 1),
                  (reason: unknown) => setError(savedErrorMessage(reason)),
                );
              }}
            >
              移入回收站
            </button>
          </li>
        ))}
      </ul>
      {(entries ?? [])
        .filter((entry) => entry.status === 'unreadable')
        .map((entry) => (
          <p role="alert" key={entry.id}>
            牌例 {entry.id} 暂不可读取，原始数据已保留。
          </p>
        ))}
    </section>
  );
}
