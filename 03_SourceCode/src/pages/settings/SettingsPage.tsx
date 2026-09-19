import { useEffect, useState } from 'react';
import {
  DEFAULT_CALCULATOR_PREFERENCES,
  updateCalculatorPreferences,
  setWaitSortMode,
  type CalculatorPreferencesPort,
  type CalculatorPreferences,
  type ManagedCalculatorPreferencesPort,
} from '../../application/preferences';
import type { WaitSortMode } from '../../application/ready-analysis';
import type { LocalDataManagement } from '../../application/persistence/local-data-management';
import {
  LocalDataSettings,
  PreferenceRecovery,
} from '../../features/saved-examples/LocalDataSettings';

export function SettingsPage({
  onReplayOnboarding,
  preferencesPort,
  localPreferences,
  localData,
}: Readonly<{
  onReplayOnboarding?: (() => Promise<unknown>) | undefined;
  preferencesPort?: CalculatorPreferencesPort | undefined;
  localPreferences?: ManagedCalculatorPreferencesPort | undefined;
  localData?: LocalDataManagement | undefined;
}>) {
  const [waitSortMode, setLocalWaitSortMode] = useState<WaitSortMode>('highest-score');
  const [preferences, setPreferences] = useState(DEFAULT_CALCULATOR_PREFERENCES);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (preferencesPort === undefined) return;
    let active = true;
    void preferencesPort.read().then((preferences) => {
      if (active) {
        setLocalWaitSortMode(preferences.waitSortMode);
        setPreferences(preferences);
      }
    });
    return () => {
      active = false;
    };
  }, [preferencesPort]);
  useEffect(
    () =>
      localPreferences?.state.subscribe((value) => {
        setPreferences(value.preferences);
        setLocalWaitSortMode(value.preferences.waitSortMode);
      }),
    [localPreferences],
  );
  const update = (change: Partial<CalculatorPreferences>) => {
    if (preferencesPort === undefined) return;
    void updateCalculatorPreferences(preferencesPort, (current) => ({
      ...current,
      ...change,
    })).then(setPreferences, () => setError('偏好更新未完成，请重试。'));
  };

  const updateSortMode = (mode: WaitSortMode): void => {
    setLocalWaitSortMode(mode);
    if (preferencesPort !== undefined)
      void setWaitSortMode(preferencesPort, mode).catch(() => setError('偏好更新未完成，请重试。'));
  };

  return (
    <section className="page-shell" aria-labelledby="settings-title">
      <h1 id="settings-title">设置</h1>
      {error !== null && <p role="alert">{error}</p>}
      {localPreferences !== undefined && <PreferenceRecovery preferences={localPreferences} />}
      {preferencesPort !== undefined && (
        <section className="settings-card settings-preferences" aria-label="外观与偏好">
          <h2>外观与偏好</h2>
          <label>
            主题
            <select
              value={preferences.theme}
              onChange={(event) => {
                const theme = event.target.value;
                if (theme === 'system' || theme === 'light' || theme === 'dark') update({ theme });
              }}
            >
              <option value="system">跟随系统</option>
              <option value="light">浅色</option>
              <option value="dark">深色</option>
            </select>
          </label>
          <label>
            动画
            <select
              value={preferences.motion}
              onChange={(event) => {
                const motion = event.target.value;
                if (motion === 'system' || motion === 'reduced' || motion === 'full')
                  update({ motion });
              }}
            >
              <option value="system">跟随系统减少动态效果</option>
              <option value="reduced">减少动态效果</option>
              <option value="full">完整动画</option>
            </select>
          </label>
          <label>
            默认复制格式
            <select
              value={preferences.defaultCopyFormat}
              onChange={(event) => {
                const defaultCopyFormat = event.target.value;
                if (defaultCopyFormat === 'concise' || defaultCopyFormat === 'detailed')
                  update({ defaultCopyFormat });
              }}
            >
              <option value="concise">简洁</option>
              <option value="detailed">详细</option>
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={preferences.autoUpdateCheckEnabled}
              onChange={(event) => update({ autoUpdateCheckEnabled: event.target.checked })}
            />
            允许低频检查更新（仅记录偏好，更新服务尚未接入）
          </label>
        </section>
      )}
      {localData !== undefined && <LocalDataSettings service={localData} />}
      {preferencesPort !== undefined && (
        <section className="settings-card" aria-labelledby="ready-sort-title">
          <h2 id="ready-sort-title">听牌方案排序</h2>
          <p>只影响展示顺序，不改变听牌、番数或合法性计算。</p>
          <label>
            <input
              type="radio"
              name="wait-sort-mode"
              checked={waitSortMode === 'highest-score'}
              onChange={() => updateSortMode('highest-score')}
            />
            高番优先（默认）
          </label>
          <label>
            <input
              type="radio"
              name="wait-sort-mode"
              checked={waitSortMode === 'wait-count'}
              onChange={() => updateSortMode('wait-count')}
            />
            听口优先
          </label>
        </section>
      )}
      {onReplayOnboarding !== undefined && (
        <section className="settings-card" aria-labelledby="help-title">
          <h2 id="help-title">帮助</h2>
          <p>可重新显示 Calculator 的规则提示和录牌引导。</p>
          <button
            className="secondary-action"
            type="button"
            onClick={() => void onReplayOnboarding()}
          >
            下次进入时重播引导
          </button>
        </section>
      )}
    </section>
  );
}
