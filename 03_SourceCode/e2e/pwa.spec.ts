import { expect, test, type Page } from '@playwright/test';

async function waitForServiceWorkerRegistration(page: Page) {
  await page.goto('/');
  expect(await page.evaluate(async () => Boolean(await navigator.serviceWorker.ready))).toBe(true);
}

test('registers the service worker engineering hook without claiming offline support', async ({
  page,
}) => {
  const consoleIssues: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleIssues.push(`${message.type()}: ${message.text()}`);
    }
  });

  await waitForServiceWorkerRegistration(page);

  expect(consoleIssues).toEqual([]);
});
