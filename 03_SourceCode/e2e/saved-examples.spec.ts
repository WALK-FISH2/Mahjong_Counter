import { expect, test, type Page } from '@playwright/test';

function consoleIssues(page: Page): string[] {
  const issues: string[] = [];
  page.on('pageerror', (error) => issues.push(error.message));
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) issues.push(message.text());
  });
  return issues;
}

async function loadLegalExample(page: Page) {
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
  await expect(page.getByRole('heading', { name: '合法和牌', exact: true })).toBeVisible();
}

async function analyze(page: Page) {
  await page.getByRole('button', { name: '开始分析', exact: true }).click();
  const notice = page.getByRole('dialog', { name: '确认使用测试版规则' });
  if (await notice.isVisible()) await notice.getByRole('button', { name: '确认并继续' }).click();
}

async function save(page: Page, name: string, action = '保存牌例') {
  await page.getByRole('button', { name: action, exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '保存牌例', exact: true });
  await expect(dialog.locator('input')).toHaveCount(1);
  await dialog.getByRole('textbox', { name: '名称' }).fill(name);
  await dialog.getByRole('button', { name: '确认保存', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('region', { name: '牌例保存状态' })).toContainText(`已保存：${name}`);
  await expect(page).toHaveURL(/#\/calculator$/u);
}

async function openEdit(page: Page, name: string) {
  await page
    .getByRole('navigation', { name: '主导航' })
    .getByRole('link', { name: '已保存牌例' })
    .click();
  await page.getByRole('link', { name, exact: true }).click();
  await page.getByRole('button', { name: '编辑牌例', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: '确认编辑' }).click();
  await expect(page).toHaveURL(/#\/calculator$/u);
}

test('Batch 20 IndexedDB save/reload/read-only/edit/update/save-as/discard on mobile and desktop', async ({
  page,
}, testInfo) => {
  const issues = consoleIssues(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await loadLegalExample(page);
  await save(page, '初始牌例');
  const score = await page.locator('.result-total').innerText();
  await page
    .getByRole('navigation', { name: '主导航' })
    .getByRole('link', { name: '已保存牌例' })
    .click();
  await page.reload();
  await page.getByRole('link', { name: '初始牌例', exact: true }).click();
  await expect(page.getByText(/只读查看/u)).toBeVisible();
  await expect(page.locator('.result-total')).toHaveText(score);
  await page.screenshot({
    path: `docs/verification/m9/screenshots/batch-20-${testInfo.project.name}-readonly-mobile.png`,
    fullPage: true,
  });
  await expect(page.getByRole('button', { name: '保存牌例', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '编辑牌例' }).click();
  await page.getByRole('dialog').getByRole('button', { name: '取消' }).click();
  await expect(page.getByText(/只读查看/u)).toBeVisible();
  await page.getByRole('button', { name: '编辑牌例' }).click();
  await page.getByRole('dialog').getByRole('button', { name: '确认编辑' }).click();
  await analyze(page);
  await expect(page.getByRole('button', { name: '更新原记录', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '更新原记录', exact: true }).click();
  const update = page.getByRole('dialog', { name: '更新原记录' });
  await update.getByRole('textbox', { name: '名称' }).fill('已更新牌例');
  await update.getByRole('button', { name: '确认更新原记录' }).click();
  await expect(update).not.toBeVisible();
  await page.setViewportSize({ width: 1280, height: 800 });
  await save(page, '副本', '另存为新牌例');
  await page.screenshot({
    path: `docs/verification/m9/screenshots/batch-20-${testInfo.project.name}-editor-desktop.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: '放弃修改', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: '确认放弃' }).click();
  await expect(page.getByRole('heading', { name: '副本', exact: true })).toBeVisible();
  await page.getByRole('link', { name: '返回牌例列表' }).click();
  await expect(page.locator('.saved-list > li')).toHaveCount(2);
  await page.getByRole('searchbox', { name: '名称搜索' }).fill('更新');
  await expect(page.locator('.saved-list > li')).toHaveCount(1);
  await page.getByRole('searchbox', { name: '名称搜索' }).fill('');
  await page.getByRole('combobox', { name: '规则筛选' }).selectOption('common-simple');
  await page.getByRole('combobox', { name: '排序' }).selectOption('name');
  await expect(page.locator('.saved-list > li')).toHaveCount(2);
  expect(issues).toEqual([]);
});

test('Batch 20 same-name saves stay distinct; actual illegal layer and Quick Calc cannot save', async ({
  page,
}) => {
  const issues = consoleIssues(page);
  await loadLegalExample(page);
  await save(page, '同名');
  await save(page, '同名');
  await page.getByRole('button', { name: '我已知道番型，只想快速合计' }).click();
  await expect(page.getByRole('button', { name: '保存牌例', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '返回牌面计算' }).click();
  await page.getByRole('button', { name: '忽略当前和牌，继续分析出牌' }).click();
  await expect(page.getByRole('heading', { name: '打哪张后听牌' })).toBeVisible();
  await expect(page.getByRole('button', { name: '保存牌例', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '更新原记录', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '返回正式和牌结果' }).click();
  await expect(page.getByRole('button', { name: '保存牌例', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '临时调整本次规则' }).click();
  const dialog = page.getByRole('dialog', { name: '临时规则调整' });
  await dialog.getByLabel('最低起胡值').fill('1000');
  await dialog.getByRole('button', { name: '应用本次规则' }).click();
  await expect(page.getByRole('heading', { name: '结构成和，但按当前规则不能胡' })).toBeVisible();
  await page.getByRole('button', { name: '系统预设结果', exact: true }).click();
  await expect(page.getByRole('heading', { name: '合法和牌', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '保存牌例', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '更新原记录', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '我已知道番型，只想快速合计' }).click();
  await expect(page.getByRole('button', { name: '保存牌例', exact: true })).toHaveCount(0);
  await page
    .getByRole('navigation', { name: '主导航' })
    .getByRole('link', { name: '已保存牌例' })
    .click();
  await expect(page.getByRole('link', { name: '同名', exact: true })).toHaveCount(2);
  expect(issues).toEqual([]);
});

test('Batch 20 concurrent explicit update rejects stale originals without overwriting', async ({
  page,
  context,
}) => {
  await loadLegalExample(page);
  await save(page, '并发原始');
  const other = await context.newPage();
  await other.goto('/#/saved');
  await other.getByRole('link', { name: '并发原始', exact: true }).click();
  await other.getByRole('button', { name: '编辑牌例' }).click();
  await other.getByRole('dialog').getByRole('button', { name: '确认编辑' }).click();
  await analyze(other);
  await openEdit(page, '并发原始');
  await analyze(page);
  for (const [target, name] of [
    [page, '先保存'],
    [other, '不得覆盖'],
  ] as const) {
    await expect(target.getByRole('button', { name: '更新原记录', exact: true })).toBeEnabled();
    await target.getByRole('button', { name: '更新原记录', exact: true }).click();
    const dialog = target.getByRole('dialog', { name: '更新原记录' });
    await dialog.getByRole('textbox', { name: '名称' }).fill(name);
    await dialog.getByRole('button', { name: '确认更新原记录' }).click();
    if (target === page) await expect(dialog).not.toBeVisible();
    else await expect(dialog.getByRole('alert')).toContainText('未覆盖任何记录');
  }
  await page.goto('/#/saved');
  await expect(page.locator('.saved-list > li')).toHaveCount(1);
  await expect(page.getByRole('link', { name: '先保存', exact: true })).toBeVisible();
});

test('Batch 20 IndexedDB unavailable never reports saved and does not break Calculator or Encyclopedia', async ({
  page,
}) => {
  const issues = consoleIssues(page);
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', { get: () => undefined });
  });
  await loadLegalExample(page);
  await page.getByRole('button', { name: '保存牌例', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '保存牌例', exact: true });
  await dialog.getByRole('button', { name: '确认保存', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('本地存储不可用');
  await dialog.getByRole('button', { name: '取消' }).click();
  await expect(page.getByRole('heading', { name: '合法和牌', exact: true })).toBeVisible();
  await page
    .getByRole('navigation', { name: '主导航' })
    .getByRole('link', { name: '规则百科' })
    .click();
  await expect(page.getByRole('list', { name: '完整番表' }).getByRole('link')).toHaveCount(81);
  expect(issues).toEqual([]);
});
