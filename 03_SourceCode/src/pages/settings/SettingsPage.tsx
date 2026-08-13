import { useEffect, useState } from 'react';
import { setWaitSortMode, type CalculatorPreferencesPort } from '../../application/preferences';
import type { WaitSortMode } from '../../application/ready-analysis';

export function SettingsPage({
  onReplayOnboarding,
  preferencesPort,
}: Readonly<{
  onReplayOnboarding?: (() => Promise<unknown>) | undefined;
  preferencesPort?: CalculatorPreferencesPort | undefined;
}>) {
  const [waitSortMode, setLocalWaitSortMode] = useState<WaitSortMode>('highest-score');

  useEffect(() => {
    if (preferencesPort === undefined) return;
    let active = true;
    void preferencesPort.read().then((preferences) => {
      if (active) setLocalWaitSortMode(preferences.waitSortMode);
    });
    return () => {
      active = false;
    };
  }, [preferencesPort]);

  const updateSortMode = (mode: WaitSortMode): void => {
    setLocalWaitSortMode(mode);
    if (preferencesPort !== undefined) void setWaitSortMode(preferencesPort, mode);
  };

  return (
    <section className="page-shell" aria-labelledby="settings-title">
      <h1 id="settings-title">设置</h1>
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
