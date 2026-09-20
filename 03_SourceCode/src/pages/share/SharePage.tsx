import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { SharePreview, ShareService } from '../../application/share/share-service';
import { formatShareText } from '../../application/result-text/result-text-formatter';
import { MAX_SAFE_SHARE_URL_LENGTH } from '../../schemas/share/share-input-limits';
import { useShareConfirmation } from '../../features/share/use-share-confirmation';
import { ShareError } from '../../application/share/share-models';

export function SharePage({ service }: Readonly<{ service: ShareService | undefined }>) {
  const { payload = '' } = useParams();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<SharePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const confirmation = useShareConfirmation();
  useEffect(() => {
    let active = true;
    if (service !== undefined) {
      const decoded =
        window.location.href.length > MAX_SAFE_SHARE_URL_LENGTH
          ? Promise.reject(new Error('SHARE_URL_TOO_LONG'))
          : service.preview(payload);
      void decoded
        .then((p) => {
          if (active) {
            setPreview(p);
            setError(null);
          }
        })
        .catch((e: unknown) => {
          if (active) {
            setPreview(null);
            setError(
              e instanceof ShareError && e.code === 'SHARE_DECOMPRESSION_UNAVAILABLE'
                ? 'SHARE_DECOMPRESSION_UNAVAILABLE：此浏览器不支持分享解压能力；未修改当前计算，请使用支持此能力的浏览器。'
                : '分享内容损坏、格式不受支持或超过安全资源限制；未修改当前计算。',
            );
          }
        });
    }
    return () => {
      active = false;
    };
  }, [service, payload]);
  const replace = async () => {
    if (preview === null || service === undefined) return;
    setBusy(true);
    try {
      const r = await service.open(preview, () =>
        confirmation.confirm('打开分享会替换当前计算器输入；已请求草稿保护。是否继续？'),
      );
      if (r.status === 'replaced') await navigate('/calculator');
      else
        setNotice(
          r.status === 'cancelled'
            ? '已取消；当前输入未替换。'
            : '无法可靠保护当前草稿或当前窗口只读。仅隔离预览，未替换计算器。',
        );
    } catch {
      setNotice('未能打开分享；当前输入未替换。');
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="page-shell" aria-labelledby="share-title">
      <h1 id="share-title">分享内容预览</h1>
      <p>以下是外部提供的历史/展示快照，未经本地计算验证。预览不会覆盖当前牌面。</p>
      {error !== null ? (
        <p role="alert">{error}</p>
      ) : preview === null ? (
        <p role="status">正在验证分享内容…</p>
      ) : (
        <>
          <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
            {formatShareText(preview.payload, 'simple')}
          </pre>
          <details>
            <summary>详细快照与 Explanation</summary>
            <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
              {formatShareText(preview.payload, 'detailed')}
            </pre>
          </details>
          {preview.compatibility === 'read-only' ? (
            <p role="alert">规则或 Engine 不兼容，仅只读预览；不会自动升级规则。{preview.reason}</p>
          ) : (
            <button type="button" disabled={busy} onClick={() => void replace()}>
              带入计算器
            </button>
          )}
        </>
      )}
      {notice !== null && <p role="status">{notice}</p>}
      {confirmation.dialog}
    </section>
  );
}
