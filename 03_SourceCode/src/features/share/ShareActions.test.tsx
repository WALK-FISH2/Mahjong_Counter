import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { shareFixture } from '../../test/helpers/share-fixture';
import { DEFAULT_CALCULATOR_PREFERENCES } from '../../application/preferences';
import { ShareActions } from './ShareActions';

const originalShow = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close');
beforeEach(() => {
  // jsdom lacks native dialogs; browser focus/modal behavior is verified by Playwright.
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.open = true;
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.open = false;
    },
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  if (originalShow) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', originalShow);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
  if (originalClose) Object.defineProperty(HTMLDialogElement.prototype, 'close', originalClose);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
});
async function setup() {
  const f = shareFixture();
  await f.store.getState().startAnalysis();
  const encode = vi
    .fn<typeof f.service.encode>()
    .mockResolvedValue({ status: 'ready', url: 'https://test.local/#/share/valid' });
  const service = { ...f.service, encode };
  return { ...f, service, encode };
}
it('summary confirmation is required before encoding; cancel produces no URL', async () => {
  const f = await setup();
  render(
    <ShareActions
      service={f.service}
      calculator={f.store}
      capture={() => f.service.captureFormal()}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: '分享链接' }));
  const summary = await screen.findByRole('dialog', { name: '分享前摘要' });
  for (const label of ['legal-win', '系统预设结果', 'TESTING', '1.0.0', '手牌', '胡牌张'])
    expect(summary).toHaveTextContent(label);
  expect(f.encode).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '取消' }));
  expect(f.encode).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '分享链接' }));
  await screen.findByRole('dialog');
  fireEvent.click(screen.getByRole('button', { name: '确认生成分享链接' }));
  await screen.findByRole('textbox', { name: '分享 URL' });
  expect(f.encode).toHaveBeenCalledTimes(1);
});
it('document changes during the summary reject the old request without calling codec', async () => {
  const f = await setup();
  render(
    <ShareActions
      service={f.service}
      calculator={f.store}
      capture={() => f.service.captureFormal()}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: '分享链接' }));
  await screen.findByRole('dialog');
  f.store.getState().removeWinningTile();
  fireEvent.click(screen.getByRole('button', { name: '确认生成分享链接' }));
  await waitFor(() =>
    expect(screen.getByRole('status')).toHaveTextContent('SHARE_UNFINISHED_OR_STALE'),
  );
  expect(f.encode).not.toHaveBeenCalled();
  expect(screen.queryByRole('textbox', { name: '分享 URL' })).not.toBeInTheDocument();
});
it('fallback never invents a JSON file; default copy preference and manual text copy remain usable', async () => {
  const f = await setup();
  f.encode.mockResolvedValue({ status: 'single-example-fallback-required', length: 8001 });
  render(
    <ShareActions
      service={f.service}
      calculator={f.store}
      capture={() => f.service.captureFormal()}
      copy={f.service.copyFormal}
      preferences={{
        read: () =>
          Promise.resolve({ ...DEFAULT_CALCULATOR_PREFERENCES, defaultCopyFormat: 'detailed' }),
        write: () => Promise.resolve(),
      }}
    />,
  );
  await waitFor(() =>
    expect(screen.getByRole('combobox', { name: '复制格式' })).toHaveValue('detailed'),
  );
  fireEvent.click(screen.getByRole('button', { name: '分享链接' }));
  await screen.findByRole('dialog');
  fireEvent.click(screen.getByRole('button', { name: '确认生成分享链接' }));
  await waitFor(() =>
    expect(screen.getByRole('status')).toHaveTextContent('single-example-fallback-required'),
  );
  expect(screen.queryByRole('textbox', { name: '分享 URL' })).not.toBeInTheDocument();
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '复制结果' }));
  const text = await screen.findByRole('textbox', { name: '结果文字' });
  if (!(text instanceof HTMLTextAreaElement)) throw new Error('Expected manual copy textarea');
  expect(text.value).toContain('Explanation');
  expect(text.value).not.toContain('mahjong-example');
});
