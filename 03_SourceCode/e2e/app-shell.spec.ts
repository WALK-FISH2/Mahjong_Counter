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
