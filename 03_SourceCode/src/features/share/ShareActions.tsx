import { useEffect, useState } from 'react';
import type { CalculatorPreferencesPort } from '../../application/preferences';
import type { CalculatorStore } from '../../application/calculator/calculator-store';
import { ShareError, type SharePayloadV1 } from '../../application/share/share-models';
import type { ShareService } from '../../application/share/share-service';
import {
  formatShareText,
  type TextFormat,
} from '../../application/result-text/result-text-formatter';
import { createBrowserClipboardPort } from '../../infrastructure/clipboard';
import { ShareDialog } from './ShareDialog';

export function ShareActions({
  service,
  calculator,
  capture,
  copy,
  preferences,
  shareAllowed = true,
}: Readonly<{
  service: ShareService;
  calculator: CalculatorStore;
  capture: () => SharePayloadV1 | Promise<SharePayloadV1>;
  copy?: (format: TextFormat) => string;
  preferences?: CalculatorPreferencesPort;
  shareAllowed?: boolean;
}>) {
  const [pending, setPending] = useState<{
    payload: SharePayloadV1;
    state: ReturnType<CalculatorStore['getState']>;
  } | null>(null);
  const [format, setFormat] = useState<TextFormat>('simple');
  const [text, setText] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    if (preferences !== undefined)
      void preferences
        .read()
        .then((p) => {
          if (active) setFormat(p.defaultCopyFormat === 'detailed' ? 'detailed' : 'simple');
        })
        .catch(() => {
          if (active) setNotice('无法读取默认复制格式；本次使用简洁版。');
        });
    return () => {
      active = false;
    };
  }, [preferences]);
  const error = (e: unknown) =>
    setNotice(
      `操作未完成，未生成分享：${e instanceof ShareError ? e.code : '数据无效或浏览器能力不可用'}。可尝试文字复制。`,
    );
  const prepare = async () => {
    setBusy(true);
    setNotice(null);
    setUrl(null);
    const state = calculator.getState();
    try {
      const payload = await capture();
      if (calculator.getState() !== state) throw new ShareError('SHARE_UNFINISHED_OR_STALE');
      setPending({ payload, state });
    } catch (e) {
      error(e);
    } finally {
      setBusy(false);
    }
  };
  const confirm = async () => {
    if (pending === null) return;
    setBusy(true);
    try {
      if (calculator.getState() !== pending.state)
        throw new ShareError('SHARE_UNFINISHED_OR_STALE');
      const result = await service.encode(pending.payload, window.location.href);
      if (calculator.getState() !== pending.state)
        throw new ShareError('SHARE_UNFINISHED_OR_STALE');
      if (result.status === 'ready') {
        setUrl(result.url);
        setNotice('链接已生成。编码与压缩不是加密，请仅分享你愿意公开的内容。');
      } else if (result.status === 'capability-unavailable')
        setNotice(
          'SHARE_COMPRESSION_UNAVAILABLE：此浏览器不支持所需压缩能力，未生成分享链接。文字复制仍可用。',
        );
      else
        setNotice(
          'single-example-fallback-required：完整链接超过项目安全长度，需要改用单牌例 JSON。正式单牌例导出尚未接入；没有截断链接，文字复制仍可用。',
        );
    } catch (e) {
      error(e);
    } finally {
      setPending(null);
      setBusy(false);
    }
  };
  const copyText = async () => {
    setBusy(true);
    const state = calculator.getState();
    try {
      const value = copy === undefined ? formatShareText(await capture(), format) : copy(format);
      if (calculator.getState() !== state) throw new ShareError('SHARE_UNFINISHED_OR_STALE');
      setText(value);
      try {
        await createBrowserClipboardPort().writeText(value);
        setNotice('文字已复制。');
      } catch {
        setNotice('无法自动复制，请从下方文本框手动复制。');
      }
    } catch (e) {
      error(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="share-actions">
      <label>
        复制格式{' '}
        <select
          aria-label="复制格式"
          value={format}
          onChange={(e) => setFormat(e.target.value === 'detailed' ? 'detailed' : 'simple')}
        >
          <option value="simple">简洁版</option>
          <option value="detailed">详细版</option>
        </select>
      </label>
      <button type="button" disabled={busy} onClick={() => void copyText()}>
        复制结果
      </button>
      {shareAllowed && (
        <button type="button" disabled={busy} onClick={() => void prepare()}>
          分享链接
        </button>
      )}
      {notice !== null && <p role="status">{notice}</p>}
      {text !== null && (
        <label>
          结果文字
          <textarea
            aria-label="结果文字"
            readOnly
            value={text}
            rows={8}
            style={{ width: '100%' }}
          />
        </label>
      )}
      {url !== null && (
        <>
          <label>
            分享 URL
            <textarea
              aria-label="分享 URL"
              readOnly
              value={url}
              rows={3}
              style={{ width: '100%' }}
            />
          </label>
          <button
            type="button"
            onClick={() =>
              void createBrowserClipboardPort()
                .writeText(url)
                .then(() => setNotice('分享链接已复制。'))
                .catch(() => setNotice('无法自动复制，请从分享 URL 文本框手动复制。'))
            }
          >
            复制分享链接
          </button>
        </>
      )}
      {pending !== null && (
        <ShareDialog title="分享前摘要" onClose={() => setPending(null)}>
          <p>内容类型：{pending.payload.contentType}</p>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{formatShareText(pending.payload, 'simple')}</pre>
          {pending.payload.resultSnapshot.kind === 'evaluation' &&
            pending.payload.resultSnapshot.value.display.warnings.map((w, i) => (
              <p key={i}>警告：{w}</p>
            ))}
          <p>分享后他人可看到完整牌面、规则版本、结果层及调整。</p>
          <button type="button" disabled={busy} onClick={() => void confirm()}>
            确认生成分享链接
          </button>
        </ShareDialog>
      )}
    </div>
  );
}
