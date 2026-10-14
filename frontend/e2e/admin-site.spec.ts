import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// v5.163.0: the admin panel is its own page (admin.html; admin.bustandeen.com
// in production). It loads none of the app: no service worker, no manifest,
// no app session. Inside the app, /admin hands over with a full page load.

test.use({ colorScheme: 'dark' });

test.beforeEach(async ({ context }) => {
  await context.route(
    (url) => url.hostname !== 'localhost',
    (route) => route.abort()
  );
});

test('the admin page is its own page: sign-in, no worker, no manifest', async ({ page }) => {
  await page.goto('/admin/users');
  await expect(page).toHaveTitle('Bustandeen Admin');
  await expect(page.getByRole('heading', { name: 'Admin sign-in' })).toBeVisible();
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(0);
  const scripts = await page.evaluate(() =>
    [...document.scripts].map((s) => new URL(s.src || location.href).pathname)
  );
  expect(scripts.every((s) => /^\/assets\/admin\/.*\.js$/.test(s))).toBe(true);
  await page.waitForTimeout(1500);
  expect(
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)
  ).toBe(0);
  const res = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(res.violations.map((v) => v.id)).toEqual([]);
});

test('/admin inside the app hands over to the admin page', async ({ page }) => {
  await page.goto('/about');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.evaluate(() => {
    window.history.pushState({}, '', '/admin/feedback');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page).toHaveTitle('Bustandeen Admin');
  await expect(page).toHaveURL(/\/admin\/feedback$/);
  await expect(page.getByRole('heading', { name: 'Admin sign-in' })).toBeVisible();
});
