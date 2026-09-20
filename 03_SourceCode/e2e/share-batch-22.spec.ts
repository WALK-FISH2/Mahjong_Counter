import { expect, test, type Page } from '@playwright/test';
import { deflateSync, inflateSync } from 'node:zlib';
import { parseSharePayload } from '../src/schemas/share/share-payload-schema';
import { parsePersistedCalculatorState } from '../src/schemas/persistence/calculator-state-schema';

function observe(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (['error', 'warning'].includes(m.type())) errors.push(m.text());
  });
  return errors;
}
async function analyze(page: Page) {
  await page.getByRole('button', { name: '开始分析', exact: true }).click();
  const testing = page.getByRole('dialog', { name: '确认使用测试版规则' });
  if (await testing.isVisible()) await testing.getByRole('button', { name: '确认并继续' }).click();
  await expect(page.getByRole('heading', { name: '合法和牌', exact: true })).toBeVisible();
}
async function legal(page: Page) {
  await page.goto('/#/rules');
  await page
    .getByRole('heading', { name: '基础示例', exact: true })
    .locator('..')
    .getByRole('button', { name: '带入计算器' })
    .click();
  await page
    .getByRole('dialog', { name: '带入百科示例？' })
    .getByRole('button', { name: '确认带入' })
    .click();
  await analyze(page);
}
async function compactLegal(page: Page) {
  await page.goto('/#/calculator');
  const onboarding = page.getByLabel('首次使用引导');
  if (await onboarding.isVisible())
    await onboarding.getByRole('button', { name: '知道了' }).click();
  for (const code of ['m1', 'p2', 's3', 'east']) {
    await page.getByRole('button', { name: '碰', exact: true }).click();
    await page.locator(`.tile-palette button[data-tile-code="${code}"]`).click();
  }
  await page.locator('.tile-palette button[data-tile-code="white"]').click();
  await page.getByRole('button', { name: '选择胡牌张', exact: true }).click();
  await page.locator('.tile-palette button[data-tile-code="white"]').click();
  const context = page.getByRole('heading', { name: '和牌条件' }).locator('..');
  await context.getByLabel('门风').selectOption({ label: '东风' });
  await context.getByLabel('圈风').selectOption({ label: '南风' });
  await analyze(page);
}
async function persistedCurrent(page: Page) {
  await expect
    .poll(() => draft(page))
    .toMatchObject({ hand: { winningTile: 'white' }, source: { kind: 'encyclopedia-example' } });
}
async function share(page: Page, type = 'legal-win') {
  await page.getByRole('button', { name: '分享链接', exact: true }).click();
  const summary = page.getByRole('dialog', { name: '分享前摘要' });
  await expect(summary).toContainText(type);
  for (const s of ['TESTING', '1.0.0', '手牌', '胡牌张', '完整牌面'])
    await expect(summary).toContainText(s);
  await summary.getByRole('button', { name: '确认生成分享链接' }).click();
  await expect(summary).not.toBeVisible();
  await expect(page.getByRole('textbox', { name: '分享 URL', exact: true })).toBeVisible();
  return page.getByRole('textbox', { name: '分享 URL', exact: true }).inputValue();
}
async function draft(page: Page): Promise<unknown> {
  return page.evaluate(
    () =>
      new Promise<unknown>((resolve, reject) => {
        const req = indexedDB.open('MahjongFanCalculatorDB');
        req.onerror = () => reject(req.error ?? new Error('open failed'));
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('draft');
          const r = tx.objectStore('draft').get('current');
          r.onsuccess = () => {
            const value: unknown = r.result;
            resolve(
              typeof value === 'object' && value !== null && 'calculator' in value
                ? value.calculator
                : null,
            );
          };
          r.onerror = () => reject(r.error ?? new Error('read failed'));
          tx.oncomplete = () => db.close();
        };
      }),
  );
}
function changedUrl(
  url: string,
  edit: (p: ReturnType<typeof parseSharePayload>) => unknown,
): string {
  const parsed: unknown = JSON.parse(
    inflateSync(Buffer.from(url.split('/share/')[1]!, 'base64url')).toString('utf8'),
  );
  return `${url.split('/share/')[0]}/share/${deflateSync(JSON.stringify(edit(parseSharePayload(parsed)))).toString('base64url')}`;
}
async function quota(page: Page) {
  await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/unbound-method -- receiver preserved with apply.
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args: Parameters<IDBObjectStore['put']>) {
      if (this.name === 'draft') throw new DOMException('Injected quota', 'QuotaExceededError');
      return put.apply(this, args);
    };
  });
}

test('T1001-T1006 legal summary/cancel, clipboard fallback, isolated preview, guarded replacement and original restore', async ({
  page,
}, info) => {
  const errors = observe(page);
  await legal(page);
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error('Injected clipboard failure')) },
    }),
  );
  await page.getByRole('button', { name: '复制结果', exact: true }).click();
  await expect(page.getByText('无法自动复制，请从下方文本框手动复制。')).toBeVisible();
  await expect(page.getByRole('textbox', { name: '结果文字' })).toContainText('系统预设结果');
  await page.getByRole('combobox', { name: '复制格式' }).selectOption('detailed');
  await page.getByRole('button', { name: '复制结果', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '结果文字' })).toContainText('Explanation');
  await page.getByRole('button', { name: '分享链接', exact: true }).click();
  await page
    .getByRole('dialog', { name: '分享前摘要' })
    .getByRole('button', { name: '取消', exact: true })
    .click();
  await expect(page.getByRole('textbox', { name: '分享 URL' })).toHaveCount(0);
  const url = await share(page);
  expect(url.length).toBeLessThanOrEqual(8000);
  await persistedCurrent(page);
  const before = await draft(page);
  const preferences = await page.evaluate(() => localStorage.getItem('mahjong.preferences'));
  await page.goto(url);
  await expect(page.getByRole('heading', { name: '分享内容预览' })).toBeVisible();
  await expect(page.getByRole('button', { name: '带入计算器' })).toBeVisible();
  expect(await draft(page)).toEqual(before);
  expect(await page.evaluate(() => localStorage.getItem('mahjong.preferences'))).toBe(preferences);
  await page.getByRole('button', { name: '带入计算器' }).click();
  await page
    .getByRole('dialog', { name: '替换当前牌面？' })
    .getByRole('button', { name: '取消', exact: true })
    .click();
  expect(await draft(page)).toEqual(before);
  await page.getByRole('button', { name: '带入计算器' }).click();
  await page
    .getByRole('dialog', { name: '替换当前牌面？' })
    .getByRole('button', { name: '确认替换' })
    .click();
  await expect(page).toHaveURL(/#\/calculator$/u);
  await expect(page.getByRole('region', { name: '原分享' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '合法和牌', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: /撤回胡牌张/u }).click();
  await page.getByRole('button', { name: '恢复原分享', exact: true }).click();
  await page
    .getByRole('dialog', { name: '替换当前牌面？' })
    .getByRole('button', { name: '确认替换' })
    .click();
  await expect(page.getByRole('button', { name: /撤回胡牌张/u })).toBeVisible();
  await expect(page.getByRole('heading', { name: '合法和牌', exact: true })).toHaveCount(0);
  await page.screenshot({
    path: `docs/verification/m10/screenshots/batch-22-${info.project.name}-restored.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test('T1003 T1005 cannot-win and three result layers keep adjustments and warnings', async ({
  page,
}) => {
  const errors = observe(page);
  await legal(page);
  await page.getByRole('button', { name: '临时调整本次规则' }).click();
  let dialog = page.getByRole('dialog', { name: '临时规则调整' });
  await dialog.getByLabel('最低起胡值').fill('1000');
  await dialog.getByRole('button', { name: '应用本次规则' }).click();
  await expect(page.getByRole('heading', { name: '结构成和，但按当前规则不能胡' })).toBeVisible();
  const cannot = await share(page, 'cannot-win');
  await page.goto(cannot);
  await expect(page.getByRole('main')).toContainText('本次规则结果');
  await expect(page.getByRole('main')).toContainText('临时规则调整');
  await page.goto('/#/calculator');
  await page.getByRole('button', { name: '系统预设结果', exact: true }).click();
  await share(page, 'legal-win');
  await page.getByRole('button', { name: '临时调整本次规则' }).click();
  dialog = page.getByRole('dialog', { name: '临时规则调整' });
  await dialog.getByLabel('最低起胡值').fill('1');
  await dialog.getByRole('button', { name: '应用本次规则' }).click();
  await expect(page.getByRole('heading', { name: '合法和牌', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '取消计入', exact: true }).first().click();
  const adjusted = await share(page);
  await page.goto(adjusted);
  await expect(page.getByRole('main')).toContainText('用户调整结果');
  await expect(page.getByRole('main')).toContainText('番型人工调整');
  expect(errors).toEqual([]);
});

test('T1003 ready and independent discard use real Worker outcomes without promoting pending/structural waits', async ({
  page,
}) => {
  const errors = observe(page);
  await compactLegal(page);
  await page.getByRole('button', { name: '忽略当前和牌，继续分析出牌' }).click();
  await expect(page.locator('.ready-discard-options button').first()).toBeVisible();
  const discard = await share(page, 'ready-analysis');
  await page.goto(discard);
  await expect(page.getByRole('main')).toContainText('discard-to-ready');
  await expect(page.getByRole('main')).toContainText('独立分析');
  await page.goto('/#/calculator');
  await page.getByRole('button', { name: /撤回胡牌张/u }).click();
  await page
    .getByRole('region', { name: '听牌分析', exact: true })
    .getByRole('button', { name: '开始分析', exact: true })
    .click();
  await expect(page.locator('.ready-primary-mode')).toBeVisible();
  const ready = await share(page, 'ready-analysis');
  await page.goto(ready);
  await expect(page.getByRole('main')).toContainText('wait-analysis');
  await expect(page.getByRole('main')).toContainText('legal');
  expect(errors).toEqual([]);
});

test('T1006 unresolved Draft and takeover during confirmation never replace or overwrite external input', async ({
  page,
  context,
}) => {
  const errors = observe(page);
  await legal(page);
  const url = await share(page);
  await persistedCurrent(page);
  await page.reload();
  await expect(page.getByRole('button', { name: '继续上次牌面' })).toBeVisible({ timeout: 15000 });
  const before = await draft(page);
  await page.goto(url);
  await page.getByRole('button', { name: '带入计算器' }).click();
  await expect(page.getByText(/无法可靠保护当前草稿或当前窗口只读/u)).toBeVisible();
  expect(await draft(page)).toEqual(before);
  await page.getByRole('button', { name: '继续上次牌面' }).click();
  await page.getByRole('button', { name: '带入计算器' }).click();
  await expect(page.getByRole('dialog', { name: '替换当前牌面？' })).toBeVisible();
  const protectedBeforeTakeover = await draft(page);
  const restored = parsePersistedCalculatorState(protectedBeforeTakeover);
  const original = parsePersistedCalculatorState(before);
  expect(restored).toEqual({ ...original, revision: original.revision + 1 });
  const other = await context.newPage();
  const otherErrors = observe(other);
  await other.goto('/#/calculator');
  await other.getByRole('button', { name: '在此窗口继续编辑' }).click();
  await expect(
    page.getByText('已在另一窗口编辑；当前计算器只读，未保存输入仍保留在本窗口。'),
  ).toBeVisible();
  await page
    .getByRole('dialog', { name: '替换当前牌面？' })
    .getByRole('button', { name: '确认替换' })
    .click();
  await expect(page).toHaveURL(url);
  expect(await draft(page)).toEqual(protectedBeforeTakeover);
  await other.getByRole('button', { name: '继续上次牌面' }).click();
  await expect(other.getByRole('region', { name: '原分享' })).toHaveCount(0);
  expect(errors).toEqual([]);
  expect(otherErrors).toEqual([]);
});

test('T1005 changing input while summary is open rejects stale sharing', async ({ page }) => {
  const errors = observe(page);
  await legal(page);
  await page.getByRole('button', { name: '分享链接', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '分享前摘要' })).toBeVisible();
  // Simulate an asynchronous input event while native modal interaction is otherwise inert.
  await page.evaluate(() =>
    document.querySelector<HTMLButtonElement>('.winning-tile-slot .tile-button--entered')?.click(),
  );
  await expect(page.getByRole('textbox', { name: '分享 URL' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '合法和牌', exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('T1007 large complete discard results safely require later single-example export; copy remains available', async ({
  page,
}) => {
  const errors = observe(page);
  await legal(page);
  await page.getByRole('button', { name: '忽略当前和牌，继续分析出牌' }).click();
  await expect(page.locator('.ready-discard-options button').first()).toBeVisible();
  await page.getByRole('button', { name: '分享链接', exact: true }).click();
  const summary = page.getByRole('dialog', { name: '分享前摘要' });
  await expect(summary).toContainText('ready-analysis');
  await summary.getByRole('button', { name: '确认生成分享链接' }).click();
  await expect(page.getByText(/single-example-fallback-required/u)).toBeVisible();
  await expect(page.getByRole('textbox', { name: '分享 URL' })).toHaveCount(0);
  await page.getByRole('button', { name: '复制结果', exact: true }).first().click();
  await expect(page.getByRole('textbox', { name: '结果文字' }).first()).toContainText(
    'discard-to-ready',
  );
  await expect(page.locator('a[download]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('T1006 Temporary Mode allows actual calculation/copy/encoding but protects inbound Draft', async ({
  page,
}) => {
  const errors = observe(page);
  await legal(page);
  await persistedCurrent(page);
  const original = await draft(page);
  await quota(page);
  await page.getByRole('button', { name: '撤回一万', exact: true }).first().click();
  await expect(page.getByText('临时使用模式', { exact: true })).toBeVisible();
  await page.locator('.tile-palette button[data-tile-code="m1"]').click();
  await analyze(page);
  await page.getByRole('button', { name: '复制结果', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '结果文字' })).toContainText('合法胡牌');
  const url = await share(page);
  await page.goto(url);
  await page.getByRole('button', { name: '带入计算器' }).click();
  await expect(page.getByText(/无法可靠保护当前草稿或当前窗口只读/u)).toBeVisible();
  expect(await draft(page)).toEqual(original);
  expect(errors).toEqual([]);
});

test('T1004 browser Compression Streams capabilities fail explicitly without alternate encoding', async ({
  page,
}) => {
  const errors = observe(page);
  await legal(page);
  const url = await share(page);
  expect(
    await page.evaluate(() => ({
      encode: typeof CompressionStream,
      decode: typeof DecompressionStream,
    })),
  ).toEqual({ encode: 'function', decode: 'function' });
  await page.evaluate(() =>
    Object.defineProperty(window, 'CompressionStream', { configurable: true, value: undefined }),
  );
  await page.getByRole('button', { name: '分享链接', exact: true }).click();
  await page
    .getByRole('dialog', { name: '分享前摘要' })
    .getByRole('button', { name: '确认生成分享链接' })
    .click();
  await expect(page.getByText(/SHARE_COMPRESSION_UNAVAILABLE/u)).toBeVisible();
  await expect(page.getByRole('textbox', { name: '分享 URL' })).toHaveCount(0);
  await page.getByRole('button', { name: '复制结果', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '结果文字' })).toBeVisible();
  await page.evaluate(() =>
    Object.defineProperty(window, 'DecompressionStream', { configurable: true, value: undefined }),
  );
  await page.goto(url);
  await expect(page.getByRole('alert')).toContainText('SHARE_DECOMPRESSION_UNAVAILABLE');
  expect(errors).toEqual([]);
});

test('T1004 malformed/oversized/truncated/bomb and incompatible snapshots stay isolated', async ({
  page,
}) => {
  const errors = observe(page);
  await legal(page);
  const url = await share(page);
  await persistedCurrent(page);
  const original = await draft(page);
  const bad = [
    'abc',
    'A'.repeat(8001),
    url.split('/share/')[1]!.slice(0, -3),
    deflateSync(' '.repeat(1048577)).toString('base64url'),
  ];
  for (const value of bad) {
    await page.goto(`/#/share/${value}`);
    await expect(page.getByRole('alert')).toContainText('未修改当前计算');
    expect(await draft(page)).toEqual(original);
  }
  const incompatible = changedUrl(url, (p) => ({
    ...p,
    rule: { ...p.rule, engineVersion: '99' },
    resultSnapshot:
      p.resultSnapshot.kind === 'evaluation'
        ? { ...p.resultSnapshot, value: { ...p.resultSnapshot.value, engineVersion: '99' } }
        : p.resultSnapshot,
  }));
  await page.goto(incompatible);
  await expect(page.getByRole('alert')).toContainText('仅只读预览');
  await expect(page.getByRole('button', { name: '带入计算器' })).toHaveCount(0);
  expect(await draft(page)).toEqual(original);
  expect(errors).toEqual([]);
});
