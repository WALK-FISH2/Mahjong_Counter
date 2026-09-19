import { expect, test, type Page } from '@playwright/test';

async function savedExample(page: Page) {
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
  const dialog = page.getByRole('dialog', { name: '保存牌例', exact: true });
  await dialog.getByRole('textbox', { name: '名称' }).fill('Batch21A真实牌例');
  await dialog.getByRole('button', { name: '确认保存' }).click();
  await expect(dialog).not.toBeVisible();
}
async function records(page: Page, table: string) {
  return page.evaluate(
    (table) =>
      new Promise<unknown[]>((resolve, reject) => {
        const request = indexedDB.open('MahjongFanCalculatorDB');
        request.onerror = () => reject(request.error ?? new Error('IDB open failed'));
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction(table);
          const read = tx.objectStore(table).getAll();
          read.onsuccess = () => resolve(read.result);
          read.onerror = () => reject(read.error ?? new Error('IDB read failed'));
          tx.oncomplete = () => db.close();
        };
      }),
    table,
  );
}
function observe(page: Page) {
  const issues: string[] = [];
  page.on('pageerror', (error) => issues.push(error.message));
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) issues.push(message.text());
  });
  return issues;
}

test('T915 unified preferences survive refresh, corruption is preserved until explicit reset', async ({
  page,
}) => {
  const issues = observe(page);
  await page.goto('/#/settings');
  await page.getByRole('combobox', { name: '主题', exact: true }).selectOption('dark');
  await page.getByRole('combobox', { name: '动画', exact: true }).selectOption('reduced');
  await page.getByRole('combobox', { name: '默认复制格式', exact: true }).selectOption('detailed');
  await page.getByLabel('听口优先').check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.getByRole('combobox', { name: '默认复制格式', exact: true })).toHaveValue(
    'detailed',
  );
  await expect(page.getByLabel('听口优先')).toBeChecked();
  await page.evaluate(() => localStorage.setItem('mahjong.preferences', '{broken'));
  await page.reload();
  await expect(page.getByText(/偏好不可读取/)).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('mahjong.preferences'))).toBe('{broken');
  await page.getByRole('button', { name: '重置损坏偏好' }).click();
  await expect(page.getByRole('combobox', { name: '主题', exact: true })).toHaveValue('system');
  expect(issues).toEqual([]);
});

test('T917 Saved Application state changes only on input and shows approximate capacity', async ({
  page,
}) => {
  const issues = observe(page);
  await savedExample(page);
  await expect(page.getByLabel('牌例保存状态')).toContainText('已保存');
  const before = await records(page, 'savedExamples');
  await page.getByRole('button', { name: '撤回一万' }).click();
  await expect(page.getByLabel('牌例保存状态')).toContainText('有未保存修改');
  await page.goto('/#/settings');
  await expect(page.getByText(/不设置人为牌例数量上限/)).toBeVisible();
  expect(await records(page, 'savedExamples')).toEqual(before);
  expect(issues).toEqual([]);
});

test('T919 two confirmations, M9 BackupExportPort failure and successful clear preserve built-in app/rules', async ({
  page,
}, info) => {
  const issues = observe(page);
  await savedExample(page);
  const saved = await records(page, 'savedExamples');
  await page.goto('/#/settings');
  await page.getByRole('combobox', { name: '主题', exact: true }).selectOption('dark');
  await page.getByRole('button', { name: '清除全部本地数据', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: '取消', exact: true }).click();
  expect(await records(page, 'savedExamples')).toEqual(saved);
  await page.getByRole('button', { name: '清除全部本地数据', exact: true }).click();
  await page.getByRole('button', { name: '已了解范围，继续' }).click();
  await page.getByRole('button', { name: '先导出完整备份再清除' }).click();
  await expect(page.getByRole('alert')).toContainText('未清除任何数据');
  expect(await records(page, 'savedExamples')).toEqual(saved);
  await page.getByRole('button', { name: '清除全部本地数据', exact: true }).click();
  await page.getByRole('button', { name: '已了解范围，继续' }).click();
  await page.getByRole('button', { name: '不备份，确认永久清除' }).click();
  await expect(page.getByText(/本地用户数据已清除/)).toBeVisible();
  for (const table of [
    'savedExamples',
    'trashExamples',
    'ruleSnapshots',
    'rulePackageMetadata',
    'migrationBackups',
  ])
    expect(await records(page, table)).toEqual([]);
  await expect(page.getByRole('combobox', { name: '主题', exact: true })).toHaveValue('system');
  await page.screenshot({
    path: `docs/verification/m9/screenshots/T919-${info.project.name}.png`,
    fullPage: true,
  });
  await page.goto('/#/calculator');
  await expect(page.getByRole('button', { name: '撤回一万' })).toHaveCount(0);
  await page.locator('.tile-palette button[data-tile-code="m1"]').click();
  await page.goto('/#/rules');
  await expect(page.getByRole('list', { name: '完整番表' }).getByRole('link')).toHaveCount(81);
  expect(issues).toEqual([]);
});

for (const unsupported of [false, true]) {
  test(`T918 actual v1 to v2 startup migration ${unsupported ? 'unsupported read-only preservation' : 'backup and unchanged Saved result'}`, async ({
    page,
    browser,
  }, info) => {
    await savedExample(page);
    const saved = await records(page, 'savedExamples');
    const snapshots = await records(page, 'ruleSnapshots');
    const context = await browser.newContext();
    const migrated = await context.newPage();
    const issues = observe(migrated);
    await migrated.route('**/seed-batch21a', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><title>Migration fixture</title>',
      }),
    );
    await migrated.goto('http://127.0.0.1:4173/seed-batch21a');
    await migrated.evaluate(
      ({ saved, snapshots, unsupported }) =>
        new Promise<void>((resolve, reject) => {
          // Dexie uses native IDB version 10 for logical schema version 1.
          const request = indexedDB.open('MahjongFanCalculatorDB', 10);
          request.onupgradeneeded = () => {
            const db = request.result;
            db.createObjectStore('savedExamples', { keyPath: 'id' });
            db.createObjectStore('trashExamples', { keyPath: 'id' });
            db.createObjectStore('draft', { keyPath: 'key' });
            db.createObjectStore('ruleSnapshots', { keyPath: 'snapshotId' });
            db.createObjectStore('rulePackageMetadata', {
              keyPath: ['ruleRef.ruleId', 'ruleRef.ruleVersion'],
            });
            db.createObjectStore('migrationBackups', { keyPath: 'id' });
          };
          request.onerror = () => reject(request.error ?? new Error('IDB seed failed'));
          request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction(['savedExamples', 'ruleSnapshots'], 'readwrite');
            for (const record of saved) tx.objectStore('savedExamples').add(record);
            for (const snapshot of snapshots) tx.objectStore('ruleSnapshots').add(snapshot);
            if (unsupported)
              tx.objectStore('savedExamples').add({ id: 'future-record', dataSchemaVersion: 99 });
            tx.oncomplete = () => {
              db.close();
              resolve();
            };
            tx.onerror = () => reject(tx.error ?? new Error('IDB transaction failed'));
          };
        }),
      { saved, snapshots, unsupported },
    );
    await migrated.goto('http://127.0.0.1:4173/#/saved');
    await expect(
      migrated.getByRole('link', { name: 'Batch21A真实牌例', exact: true }),
    ).toBeVisible();
    const backups = await records(migrated, 'migrationBackups');
    expect(backups.length).toBeGreaterThanOrEqual(2);
    expect(
      (await records(migrated, 'savedExamples')).filter(
        (record) =>
          typeof record === 'object' &&
          record !== null &&
          'id' in record &&
          record.id !== 'future-record',
      ),
    ).toEqual(saved);
    if (unsupported) {
      await expect(migrated.getByText(/数据库迁移未能可靠完成/)).toBeVisible();
      expect(await records(migrated, 'savedExamples')).toHaveLength(2);
    }
    await migrated.getByRole('link', { name: 'Batch21A真实牌例', exact: true }).click();
    await expect(migrated.getByRole('heading', { name: '合法和牌', exact: true })).toBeVisible();
    await migrated.screenshot({
      path: `docs/verification/m9/screenshots/T918-${info.project.name}-${unsupported ? 'readonly' : 'migration'}.png`,
      fullPage: true,
    });
    expect(issues).toEqual([]);
    await context.close();
  });
}
