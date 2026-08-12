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
