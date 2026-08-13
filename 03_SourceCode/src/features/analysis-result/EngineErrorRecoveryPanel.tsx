import { useSyncExternalStore, type ReactNode } from 'react';

import type { EngineErrorRecoveryService } from '../../application/analysis-lifecycle';

export function EngineErrorRecoveryPanel({
  service,
  idleContent = null,
}: Readonly<{ service: EngineErrorRecoveryService; idleContent?: ReactNode }>) {
  const state = useSyncExternalStore(service.subscribe, service.getState, service.getState);
  if (state.status !== 'error') return idleContent;

  return (
    <section className="engine-error-recovery" role="alert" aria-labelledby="engine-error-title">
      <p className="section-kicker">Engine Error</p>
      <h3 id="engine-error-title">本次计算异常</h3>
      <p>牌面、规则和条件均已保留；系统没有输出猜测结果。</p>
      <p>
        {state.draftProtected ? '当前状态已进入 Draft 保护。' : 'Draft 保护失败，请勿关闭页面。'}
      </p>
      <div className="dialog-actions">
        <button className="primary-action" type="button" onClick={() => void service.retry()}>
          重试
        </button>
        <button className="secondary-action" type="button" onClick={service.undo}>
          撤销最近操作
        </button>
        <button
          className="secondary-action"
          type="button"
          onClick={() => void service.copyIssueInfo()}
        >
          复制问题信息
        </button>
      </div>
      {state.copyStatus === 'copied' && <p role="status">问题信息已复制。</p>}
      {state.copyStatus === 'manual-copy' && state.issueInfo !== null && (
        <label>
          当前浏览器无法直接复制，请手动复制：
          <textarea readOnly value={state.issueInfo} />
        </label>
      )}
    </section>
  );
}
