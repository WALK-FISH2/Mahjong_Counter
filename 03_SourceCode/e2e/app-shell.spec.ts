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
