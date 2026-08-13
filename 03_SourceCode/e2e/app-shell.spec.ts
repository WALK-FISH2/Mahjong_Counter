import { expect, test, type Page } from '@playwright/test';

function collectConsoleIssues(page: Page): string[] {
  const issues: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      issues.push(`${message.type()}: ${message.text()}`);
    }
  });

  return issues;
}

test('serves the production build and opens every main page', async ({ page }) => {
  const consoleIssues = collectConsoleIssues(page);

  await page.goto('/');

  await expect(page).toHaveURL(/#\/calculator$/);
  await expect(page.getByRole('heading', { name: '算番' })).toBeVisible();

  const navigation = page.getByRole('navigation', { name: '主导航' });
  const pages = [
    { label: '规则百科', path: 'rules' },
    { label: '已保存牌例', path: 'saved' },
    { label: '设置', path: 'settings' },
    { label: '算番', path: 'calculator' },
  ] as const;

  for (const expectedPage of pages) {
    await navigation.getByRole('link', { name: expectedPage.label }).click();
    await expect(page).toHaveURL(new RegExp(`#/${expectedPage.path}$`));
    await expect(page.getByRole('heading', { name: expectedPage.label })).toBeVisible();
  }

  expect(consoleIssues).toEqual([]);
});

test('keeps the hash route and primary navigation usable at mobile and desktop widths', async ({
  page,
}) => {
  const consoleIssues = collectConsoleIssues(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/settings');

  const navigation = page.getByRole('navigation', { name: '主导航' });

  await expect(page).toHaveURL(/#\/settings$/);
  await expect(page.getByRole('heading', { name: '设置' })).toBeVisible();
  await expect(navigation).toBeVisible();
  expect(await navigation.evaluate((element) => getComputedStyle(element).position)).toBe('fixed');
  expect(await navigation.evaluate((element) => getComputedStyle(element).bottom)).toBe('0px');

  await page.setViewportSize({ width: 1280, height: 800 });

  await expect(navigation).toBeVisible();
  expect(await navigation.evaluate((element) => getComputedStyle(element).position)).toBe('sticky');
  expect(await navigation.evaluate((element) => getComputedStyle(element).top)).toBe('0px');
  expect(consoleIssues).toEqual([]);
});

test('supports the Batch 11 calculator input flow at mobile and desktop widths', async ({
  page,
}) => {
  const consoleIssues = collectConsoleIssues(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/calculator');

  const layout = page.getByTestId('calculator-layout');
  const palette = page.locator('.tile-palette');
  const oneWan = palette.locator('[data-tile-code="m1"]');

  await expect(page.locator('.calculator-header__rule-name')).toHaveText('大众麻将·通用简化版');
  await expect(page.locator('.status-badge--test')).toHaveText('测试版');
  await expect(page.getByText('选择规则')).toBeVisible();
  expect(
    (await layout.evaluate((element) => getComputedStyle(element).gridTemplateColumns)).split(' '),
  ).toHaveLength(1);

  await oneWan.click();
  await oneWan.click();
  await oneWan.click();
  await oneWan.click();

  await expect(oneWan).toBeDisabled();
  await expect(oneWan).toContainText('×4');
  await expect(page.getByRole('button', { name: '撤回一万' })).toHaveCount(4);

  await page.getByRole('button', { name: '撤回一万' }).first().click();
  await expect(oneWan).toBeEnabled();
  await expect(oneWan).toContainText('×3');

  await page.setViewportSize({ width: 1280, height: 900 });

  const columns = await layout.evaluate((element) => getComputedStyle(element).gridTemplateColumns);
  expect(columns.split(' ')).toHaveLength(2);
  await expect(oneWan).toContainText('×3');
  await expect(page.getByRole('button', { name: '撤回一万' })).toHaveCount(3);
  expect(consoleIssues).toEqual([]);
});

test('supports the Batch 12 temporary meld and winning-tile flow', async ({ page }) => {
  const consoleIssues = collectConsoleIssues(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/calculator');

  const palette = page.locator('.tile-palette');
  const selectTile = async (tile: string) => palette.locator(`[data-tile-code="${tile}"]`).click();

  await page.getByRole('button', { name: '吃' }).click();
  await selectTile('m1');
  await selectTile('m2');
  await page.getByRole('button', { name: '碰' }).click();
  const guard = page.getByRole('dialog', { name: '吃牌尚未完成' });
  await expect(guard.getByRole('button', { name: '继续完成吃牌' })).toBeVisible();
  await expect(guard.getByRole('button', { name: '放弃本次吃牌' })).toBeVisible();
  await expect(guard.getByRole('button', { name: '留在当前录入流程' })).toBeVisible();
  await guard.getByRole('button', { name: '留在当前录入流程' }).click();

  await selectTile('p3');
  await expect(page.getByRole('status')).toContainText('前两张已保留');
  await selectTile('m3');
  await expect(page.getByLabel('吃牌组')).toBeVisible();
  await expect(page.getByRole('heading', { name: '录入吃牌' })).toHaveCount(0);

  await page.getByRole('button', { name: '花牌' }).click();
  await selectTile('spring');
  await expect(page.getByLabel('已录入花牌')).toBeVisible();

  await page.getByRole('button', { name: '选择胡牌张' }).click();
  await selectTile('east');
  await expect(page.getByRole('button', { name: '撤回胡牌张东风' })).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.getByLabel('吃牌组')).toBeVisible();
  await expect(page.getByRole('button', { name: '撤回胡牌张东风' })).toBeVisible();
  expect(consoleIssues).toEqual([]);
});

test('supports the Batch 13 dynamic context and floating analysis status', async ({ page }) => {
  const consoleIssues = collectConsoleIssues(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/calculator');

  const navigation = page.getByRole('navigation', { name: '主导航' });
  const actionBar = page.locator('.analyze-action-bar');
  const contextPanel = page.getByRole('heading', { name: '和牌条件' }).locator('..');

  await expect(contextPanel.getByRole('radio', { name: '点炮' })).toBeChecked();
  await expect(page.getByRole('alert')).toContainText('还需补全：门风、圈风');
  await expect(actionBar).toContainText('还需补全 2 个和牌条件');
  await expect(actionBar.getByRole('button', { name: '开始分析' })).toBeDisabled();

  await contextPanel.getByLabel('门风').selectOption({ label: '东风' });
  await contextPanel.getByLabel('圈风').selectOption({ label: '南风' });
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(actionBar).toContainText('结构张数 0 / 14');

  await contextPanel.getByRole('radio', { name: '自摸' }).click();
  await contextPanel.getByText('更多条件').click();
  await expect(contextPanel.getByRole('checkbox', { name: '杠上开花' })).toBeVisible();
  await expect(contextPanel.getByRole('checkbox', { name: '抢杠和' })).toHaveCount(0);

  expect(await actionBar.evaluate((element) => getComputedStyle(element).position)).toBe('fixed');
  const actionBox = await actionBar.boundingBox();
  const navigationBox = await navigation.boundingBox();
  expect(actionBox).not.toBeNull();
  expect(navigationBox).not.toBeNull();
  expect(actionBox!.y + actionBox!.height).toBeLessThanOrEqual(navigationBox!.y);

  await page.setViewportSize({ width: 1280, height: 900 });
  expect(await actionBar.evaluate((element) => getComputedStyle(element).position)).toBe('sticky');
  expect(consoleIssues).toEqual([]);
});

test('supports Batch 13A onboarding, rule picker, Replace Guard, and navigation state', async ({
  page,
}) => {
  const consoleIssues = collectConsoleIssues(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/calculator');

  const onboarding = page.getByLabel('首次使用引导');
  await expect(onboarding).toContainText('当前使用大众麻将规则');
  await expect(onboarding).toContainText('胡牌张在固定独立区域单独录入');
  await onboarding.getByRole('button', { name: '知道了' }).click();

  const oneWan = page.locator('[data-tile-code="m1"]');
  await oneWan.click();
  await expect(page.getByRole('button', { name: '撤回一万' })).toBeVisible();

  await page.getByRole('link', { name: '规则百科' }).click();
  await expect(page).toHaveURL(/#\/rules$/);
  await page.goBack();
  await expect(page).toHaveURL(/#\/calculator$/);
  await expect(page.getByRole('button', { name: '撤回一万' })).toBeVisible();

  await page.getByRole('button', { name: '选择规则' }).click();
  const picker = page.getByRole('dialog', { name: '选择规则' });
  await expect(picker.getByLabel('搜索名称或别名')).toBeVisible();
  await picker.getByLabel('搜索名称或别名').fill('大众麻将');
  await expect(picker).toContainText('最近使用');
  await expect(picker.getByRole('button', { name: '当前规则' })).toBeDisabled();
  await page.goBack();
  await expect(picker).toHaveCount(0);
  await expect(page.getByRole('button', { name: '撤回一万' })).toBeVisible();

  await page.getByRole('button', { name: '新建牌面' }).click();
  const replaceGuard = page.getByRole('dialog', { name: '确认替换当前计算' });
  await replaceGuard.getByRole('button', { name: '取消' }).click();
  await expect(page.getByRole('button', { name: '撤回一万' })).toBeVisible();
  await page.getByRole('button', { name: '新建牌面' }).click();
  await page
    .getByRole('dialog', { name: '确认替换当前计算' })
    .getByRole('button', { name: '确认替换' })
    .click();
  await expect(page.getByRole('button', { name: '撤回一万' })).toHaveCount(0);

  await page.getByRole('link', { name: '设置' }).click();
  await page.getByRole('button', { name: '下次进入时重播引导' }).click();
  await page.getByRole('link', { name: '算番' }).click();
  await expect(page.getByLabel('首次使用引导')).toBeVisible();
  expect(consoleIssues).toEqual([]);
});

test('renders a Batch 14 formal result and rule-declared temporary adjustments', async ({
  page,
}) => {
  const consoleIssues = collectConsoleIssues(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/calculator');

  const onboarding = page.getByLabel('首次使用引导');
  if (await onboarding.isVisible()) {
    await onboarding.getByRole('button', { name: '知道了' }).click();
  }
  const palette = page.locator('.tile-palette');
  const select = async (tile: string, count = 1) => {
    for (let index = 0; index < count; index += 1) {
      await palette.locator(`[data-tile-code="${tile}"]`).click();
    }
  };
  for (const tile of ['m1', 'm2', 'm3', 'p1', 'p2', 'p3', 's1', 's2', 's3']) {
    await select(tile);
  }
  await select('east', 3);
  await select('white');
  await page.getByRole('button', { name: '选择胡牌张' }).click();
  await select('white');

  const context = page.getByRole('heading', { name: '和牌条件' }).locator('..');
  await context.getByLabel('门风').selectOption({ label: '东风' });
  await context.getByLabel('圈风').selectOption({ label: '南风' });
  await page.getByRole('button', { name: '开始分析' }).click();
  const testingConfirmation = page.getByRole('dialog', { name: '确认使用测试版规则' });
  if (await testingConfirmation.isVisible()) {
    await testingConfirmation.getByRole('button', { name: '确认并继续' }).click();
  }

  await expect(page.getByRole('heading', { name: '合法和牌' })).toBeVisible();
  await expect(page.getByText('系统预设结果')).toBeVisible();
  await expect(page.locator('.result-tile--winning').first()).toBeVisible();
  await page.getByText('查看原始牌面').click();
  await expect(page.getByLabel('原始牌面复核')).toBeVisible();
  await page.getByText('查看完整计算过程').click();
  await expect(page.getByRole('heading', { name: '3. 番型关系处理' })).toBeVisible();

  await page.getByRole('button', { name: '临时调整本次规则' }).click();
  const dialog = page.getByRole('dialog', { name: '临时规则调整' });
  await expect(dialog.locator('[data-adjustment-id]')).toHaveCount(161);
  await dialog.locator('[data-adjustment-id="minimumFan"]').fill('8');
  await dialog.getByRole('button', { name: '应用本次规则' }).click();
  await expect(page.getByText('已保存本次规则调整。系统预设结果保持不变。')).toBeVisible();
  await expect(page.getByRole('heading', { name: '合法和牌' })).toBeVisible();
  expect(consoleIssues).toEqual([]);
});

test('restores a reasonable Calculator scroll position after module navigation', async ({
  page,
}) => {
  const consoleIssues = collectConsoleIssues(page);

  await page.setViewportSize({ width: 390, height: 500 });
  await page.goto('/#/calculator');
  await page.getByLabel('首次使用引导').getByRole('button', { name: '知道了' }).click();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const before = await page.evaluate(() => window.scrollY);
  expect(before).toBeGreaterThan(0);

  await page.getByRole('link', { name: '设置' }).click();
  await expect(page).toHaveURL(/#\/settings$/);
  await page.getByRole('link', { name: '算番' }).click();
  await expect(page).toHaveURL(/#\/calculator$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  expect(consoleIssues).toEqual([]);
});

test('records the T525 small-size tile readability evidence', async ({ page }, testInfo) => {
  const consoleIssues = collectConsoleIssues(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/calculator');
  await expect(page.locator('.tile-palette')).toBeVisible();
  await expect(page.locator('[data-tile-asset]')).toHaveCount(42);
  await page.screenshot({
    path: `docs/verification/m5/screenshots/T525-${testInfo.project.name}-390x844.png`,
    fullPage: true,
  });
  expect(consoleIssues).toEqual([]);
});
