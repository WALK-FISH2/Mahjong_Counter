import { useEffect, useState } from 'react';
import { useStore } from 'zustand';
import {
  CLEAR_DATA_SCOPE,
  describeStorage,
  type LocalDataManagement,
} from '../../application/persistence/local-data-management';
import type { ManagedCalculatorPreferencesPort } from '../../application/preferences';
import { ExampleDialog } from './SaveExampleDialog';

export function PreferenceRecovery({
  preferences,
}: Readonly<{ preferences: ManagedCalculatorPreferencesPort }>) {
  const warning = useStore(preferences.state, (value) => value.warning);
  const [error, setError] = useState<string | null>(null);
  if (warning === null) return null;
  return (
    <section role="status">
      <p>{warning}</p>
      <button
        type="button"
        onClick={() => {
          try {
            preferences.reset();
            setError(null);
          } catch {
            setError('仍无法重置偏好；当前使用安全默认值。');
          }
        }}
      >
        重置损坏偏好
      </button>
      {error !== null && <p role="alert">{error}</p>}
    </section>
  );
}

export function LocalDataSettings({ service }: Readonly<{ service: LocalDataManagement }>) {
  const state = useStore(service.state);
  const [usage, setUsage] = useState(() => describeStorage({ usage: null, quota: null }));
  const [stage, setStage] = useState<0 | 1 | 2>(0);
  const refresh = () => {
    void service.estimate().then((value) => setUsage(describeStorage(value)));
  };
  useEffect(() => {
    void service.estimate().then((value) => setUsage(describeStorage(value)));
  }, [service]);
  const clear = (choice: 'without-backup' | 'export-first') => {
    setStage(0);
    void service
      .clear(
        () => true,
        () => choice,
      )
      .then(refresh);
  };
  return (
    <section className="settings-card" aria-labelledby="local-data-title">
      <h2 id="local-data-title">本地数据管理</h2>
      <p>{usage.description}；不设置人为牌例数量上限。</p>
      {usage.tight && (
        <p role="status">存储空间紧张，建议先备份或删除不需要的数据。不会自动清理。</p>
      )}
      <button className="secondary-action" onClick={refresh}>
        刷新占用估算
      </button>
      <button className="secondary-action" disabled={state.busy} onClick={() => setStage(1)}>
        清除全部本地数据
      </button>
      {state.error !== null && <p role="alert">操作未完成：{state.error}</p>}
      {state.cleared && (
        <p role="status">本地用户数据已清除，已初始化安全默认值。应用与内置核心规则保留。</p>
      )}
      {stage === 1 && (
        <ExampleDialog title="确认清除范围" onClose={() => setStage(0)}>
          <ul>
            {CLEAR_DATA_SCOPE.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
          <p>不删除应用本身、内置核心规则和其他站点的数据。此操作不可撤销。</p>
          <button className="primary-action" onClick={() => setStage(2)}>
            已了解范围，继续
          </button>
          <button onClick={() => setStage(0)}>取消</button>
        </ExampleDialog>
      )}
      {stage === 2 && (
        <ExampleDialog title="最后确认：清除本地数据" onClose={() => setStage(0)}>
          <p>建议先导出完整备份。当前 M9 未接入真实备份适配器；选择导出如失败，将不会清除。</p>
          <button className="primary-action" onClick={() => clear('export-first')}>
            先导出完整备份再清除
          </button>
          <button className="secondary-action" onClick={() => clear('without-backup')}>
            不备份，确认永久清除
          </button>
          <button onClick={() => setStage(0)}>取消</button>
        </ExampleDialog>
      )}
    </section>
  );
}
