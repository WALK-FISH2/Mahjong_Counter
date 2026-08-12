export function SettingsPage({
  onReplayOnboarding,
}: Readonly<{ onReplayOnboarding?: (() => Promise<unknown>) | undefined }>) {
  return (
    <section className="page-shell" aria-labelledby="settings-title">
      <h1 id="settings-title">设置</h1>
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
