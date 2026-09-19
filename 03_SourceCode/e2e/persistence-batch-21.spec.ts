import { expect, test, type Page } from '@playwright/test';

function observe(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) errors.push(message.text());
  });
  return errors;
}
const tile = (page: Page, code: string) =>
  page.locator(`.tile-palette button[data-tile-code="${code}"]`);
async function readStore(page: Page, name: string): Promise<unknown[]> {
  return page.evaluate(
    (name) =>
      new Promise<unknown[]>((resolve, reject) => {
        const request = indexedDB.open('MahjongFanCalculatorDB');
        request.onerror = () => reject(request.error ?? new Error('IDB open failed'));
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction(name);
          const requestAll = tx.objectStore(name).getAll();
          requestAll.onsuccess = () => resolve(requestAll.result);
          requestAll.onerror = () => reject(requestAll.error ?? new Error('IDB read failed'));
          tx.oncomplete = () => db.close();
        };
      }),
    name,
  );
}
async function legalAndSaved(page: Page, name = 'Batch21牌例') {
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
  await page.getByRole('button', { name: '开始分析', exact: true }).click();
  const testing = page.getByRole('dialog', { name: '确认使用测试版规则' });
  if (await testing.isVisible()) await testing.getByRole('button', { name: '确认并继续' }).click();
  await expect(page.getByRole('heading', { name: '合法和牌', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '保存牌例', exact: true }).click();
  const save = page.getByRole('dialog', { name: '保存牌例', exact: true });
  await save.getByRole('textbox', { name: '名称' }).fill(name);
  await save.getByRole('button', { name: '确认保存', exact: true }).click();
  await expect(save).not.toBeVisible();
}

test('T908 Trash preserves records and modifiedAt; permanent delete needs confirmation', async ({
  page,
}) => {
  const errors = observe(page);
  await legalAndSaved(page);
  const original = await readStore(page, 'savedExamples');
  await page
    .getByRole('navigation', { name: '主导航' })
    .getByRole('link', { name: '已保存牌例' })
    .click();
  await page.getByRole('button', { name: '移入回收站' }).click();
  await expect(page.locator('.saved-list > li')).toHaveCount(0);
  await page.getByRole('link', { name: '回收站', exact: true }).click();
  await page.getByRole('button', { name: '永久删除', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: '取消' }).click();
  expect(await readStore(page, 'trashExamples')).toHaveLength(1);
  await page.getByRole('button', { name: '恢复牌例' }).click();
  await expect(page.getByText('回收站为空。')).toBeVisible();
  expect(await readStore(page, 'savedExamples')).toEqual(original);
  await page.getByRole('link', { name: '返回牌例列表' }).click();
  await page.getByRole('button', { name: '移入回收站' }).click();
  await page.getByRole('link', { name: '回收站', exact: true }).click();
  await page.getByRole('button', { name: '永久删除', exact: true }).click();
  await page.getByRole('button', { name: '确认永久删除', exact: true }).click();
  await expect(page.getByText('回收站为空。')).toBeVisible();
  expect(await readStore(page, 'savedExamples')).toEqual([]);
  expect(await readStore(page, 'ruleSnapshots')).toHaveLength(1);
  expect(errors).toEqual([]);
});

test('T909 T910 T911 partial input restores but command history is session-only', async ({
  page,
}) => {
  const errors = observe(page);
  await page.goto('/#/calculator');
  await tile(page, 'm1').click();
  await tile(page, 'm2').click();
  await page.getByRole('button', { name: '撤销操作', exact: true }).click();
  await expect(page.getByRole('button', { name: '撤回二万' })).toHaveCount(0);
  await page.getByRole('button', { name: '重做操作', exact: true }).click();
  await page.getByRole('button', { name: '吃', exact: true }).click();
  await tile(page, 'p1').click();
  await tile(page, 'p2').click();
  await expect(page.getByText('草稿已保存', { exact: true })).toBeVisible();
  const draft = await readStore(page, 'draft');
  expect(draft).toHaveLength(1);
  await page.reload();
  await expect(page.getByRole('button', { name: '继续上次牌面' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('button', { name: '撤销操作', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '继续上次牌面' }).click();
  await expect(page.getByRole('button', { name: '撤回一万' })).toHaveCount(1);
  await expect(page.getByRole('heading', { name: '录入吃牌' })).toBeVisible();
  await tile(page, 'p3').click();
  await expect(page.getByLabel('吃牌组')).toBeVisible();
  await page.getByRole('button', { name: '撤销操作', exact: true }).click();
  await expect(page.getByRole('heading', { name: '录入吃牌' })).toBeVisible();
  expect(errors).toEqual([]);
});

for (const fallback of [false, true]) {
  test(`T912 two tabs takeover and stale-writer protection ${fallback ? 'polling fallback and crash expiration' : 'BroadcastChannel'}`, async ({
    page,
    context,
  }, info) => {
    const errors = observe(page);
    if (fallback)
      await context.addInitScript(() => {
        Object.defineProperty(window, 'BroadcastChannel', { value: undefined });
        Object.defineProperty(navigator, 'locks', { value: undefined });
        window.addEventListener('pagehide', (event) => event.stopImmediatePropagation(), true);
      });
    await page.goto('/#/calculator');
    await tile(page, 'm1').click();
    await expect(page.getByText('草稿已保存', { exact: true })).toBeVisible();
    const other = await context.newPage();
    const otherErrors = observe(other);
    await other.goto('/#/calculator');
    await expect(tile(other, 'm2')).toBeDisabled();
    await other.getByRole('button', { name: '在此窗口继续编辑' }).click();
    await expect(other.getByRole('button', { name: '继续上次牌面' })).toBeVisible();
    await other.getByRole('button', { name: '继续上次牌面' }).click();
    await expect(tile(page, 'm2')).toBeDisabled({ timeout: 6000 });
    await tile(other, 'm2').click();
    await expect(other.getByText('草稿已保存', { exact: true })).toBeVisible();
    await other.screenshot({
      path: `docs/verification/m9/screenshots/T912-${info.project.name}-${fallback ? 'fallback' : 'broadcast'}.png`,
      fullPage: true,
    });
    if (fallback) {
      await other.close({ runBeforeUnload: false });
      await expect(page.getByRole('button', { name: '继续上次牌面' })).toBeVisible({
        timeout: 15000,
      });
      await page.getByRole('button', { name: '继续上次牌面' }).click();
      await expect(page.getByRole('button', { name: '撤回二万' })).toHaveCount(1);
      await expect(tile(page, 'm3')).toBeEnabled();
    } else {
      await page.getByRole('button', { name: '在此窗口继续编辑' }).click();
      await page.getByRole('button', { name: '继续上次牌面' }).click();
      await expect(page.getByRole('button', { name: '撤回二万' })).toHaveCount(1);
      await expect(tile(other, 'm3')).toBeDisabled();
    }
    expect(errors).toEqual([]);
    expect(otherErrors).toEqual([]);
  });
}

test('T913 quota failure pauses saves, retains old draft and can recheck without silent overwrite', async ({
  page,
}, info) => {
  const errors = observe(page);
  await legalAndSaved(page);
  await expect(page.getByText('草稿已保存', { exact: true })).toBeVisible();
  const before = await readStore(page, 'savedExamples');
  await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/unbound-method -- fault injection preserves the receiver with apply below.
    const original = IDBObjectStore.prototype.put;
    window.addEventListener(
      'batch21-restore-put',
      () => {
        IDBObjectStore.prototype.put = original;
      },
      { once: true },
    );
    IDBObjectStore.prototype.put = function (...args: Parameters<IDBObjectStore['put']>) {
      if (this.name === 'draft' || this.name === 'savedExamples')
        throw new DOMException('injected quota', 'QuotaExceededError');
      return original.apply(this, args);
    };
  });
  await page.getByRole('button', { name: '撤回一万' }).first().click();
  await expect(page.getByText('临时使用模式', { exact: true })).toBeVisible();
  await tile(page, 'm1').click();
  await page.getByRole('button', { name: '开始分析', exact: true }).click();
  await expect(page.getByRole('heading', { name: '合法和牌', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '保存牌例', exact: true })).toHaveCount(0);
  expect(await readStore(page, 'savedExamples')).toEqual(before);
  await page.screenshot({
    path: `docs/verification/m9/screenshots/T913-${info.project.name}-quota.png`,
    fullPage: true,
  });
  await page.evaluate(() => window.dispatchEvent(new Event('batch21-restore-put')));
  await page.getByRole('button', { name: '重新检测存储' }).click();
  await expect(page.getByRole('button', { name: '继续上次牌面' })).toBeVisible();
  expect(await readStore(page, 'savedExamples')).toEqual(before);
  expect(errors).toEqual([]);
});

test('T914 incompatible engine displays saved results read-only without recalculation', async ({
  page,
}) => {
  const errors = observe(page);
  await legalAndSaved(page);
  const score = await page.locator('.result-total').innerText();
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('MahjongFanCalculatorDB');
        open.onerror = () => reject(open.error ?? new Error('IDB open failed'));
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('savedExamples', 'readwrite');
          const table = tx.objectStore('savedExamples');
          const all = table.getAll();
          all.onsuccess = () => {
            const record: unknown = all.result[0];
            if (
              typeof record !== 'object' ||
              record === null ||
              !('resultSnapshot' in record) ||
              typeof record.resultSnapshot !== 'object' ||
              record.resultSnapshot === null
            ) {
              tx.abort();
              return;
            }
            table.put({
              ...record,
              engineVersion: '99.0.0',
              resultSnapshot: { ...record.resultSnapshot, engineVersion: '99.0.0' },
            });
          };
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onabort = () => {
            db.close();
            reject(tx.error ?? new Error('IDB transaction aborted'));
          };
        };
      }),
  );
  await page
    .getByRole('navigation', { name: '主导航' })
    .getByRole('link', { name: '已保存牌例' })
    .click();
  await page.getByRole('link', { name: 'Batch21牌例', exact: true }).click();
  await expect(page.getByText(/历史牌例只读（read-only-legacy）/u)).toBeVisible();
  await expect(page.locator('.result-total')).toHaveText(score);
  await expect(page.getByRole('button', { name: '编辑牌例', exact: true })).toBeDisabled();
  expect(errors).toEqual([]);
});

for (const withoutWebLocks of [false, true]) {
  test(`T912 T913 Temporary Mode retains a single editor during takeover (${withoutWebLocks ? 'Broadcast fallback' : 'Web Locks'})`, async ({
    page,
    context,
  }) => {
    await context.addInitScript((withoutWebLocks) => {
      if (withoutWebLocks) Object.defineProperty(navigator, 'locks', { value: undefined });
      Object.defineProperty(window, 'indexedDB', {
        get: () => {
          throw new DOMException('injected unavailable storage', 'InvalidStateError');
        },
      });
    }, withoutWebLocks);
    const errors = observe(page);
    await page.goto('/#/calculator');
    await expect(page.getByText('临时使用模式', { exact: true })).toBeVisible();
    await tile(page, 'm1').click();
    const other = await context.newPage();
    const otherErrors = observe(other);
    await other.goto('/#/calculator');
    await expect(tile(other, 'm2')).toBeDisabled();
    await other.getByRole('button', { name: '在此窗口继续编辑' }).click();
    await expect(
      page.getByText('已在另一窗口编辑；当前计算器只读，未保存输入仍保留在本窗口。'),
    ).toBeVisible();
    await expect(tile(page, 'm2')).toBeDisabled();
    await expect(page.getByRole('button', { name: '撤回一万' })).toHaveCount(1);
    await tile(other, 'm2').click();
    await expect(other.getByRole('button', { name: '撤回二万' })).toHaveCount(1);
    await expect(other.getByText('临时使用模式', { exact: true })).toBeVisible();
    await expect(other.getByText('草稿已保存', { exact: true })).toHaveCount(0);
    await expect(other.getByRole('button', { name: '继续上次牌面' })).toHaveCount(0);
    expect(errors).toEqual([]);
    expect(otherErrors).toEqual([]);
  });
}
