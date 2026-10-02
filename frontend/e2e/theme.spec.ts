import { expect, test } from '@playwright/test';

// Audit T3.2: theme setting (System default, Dark, Light, Follow daylight).
// The landing and SEO pages stay dark (`data-static`), whatever is saved.

test.beforeEach(async ({ context }) => {
  await context.route(
    (url) => url.hostname !== 'localhost',
    (route) => route.abort()
  );
});

const theme = (page: import('@playwright/test').Page) =>
  page.evaluate(() => document.documentElement.getAttribute('data-theme'));

test('Settings switches the theme, and the choice survives a reload', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/demo/sister');
  await expect(page.getByText('Demo Mode').first()).toBeVisible();
  await page.goto('/settings');

  const group = page.getByRole('radiogroup', { name: 'Appearance' });
  await expect(group.getByRole('radio', { name: /Match my device/ })).toHaveAttribute(
    'aria-checked',
    'true'
  );
  expect(await theme(page)).toBe('bustandeen');

  await group.getByRole('radio', { name: /^Light/ }).click();
  expect(await theme(page)).toBe('bustandeen-light');
  // White text on a sage button stays white (on-color), body ink turns dark.
  const body = await page.evaluate(() => getComputedStyle(document.body).color);
  expect(body).not.toBe('rgb(255, 255, 255)');

  await page.reload();
  expect(await theme(page)).toBe('bustandeen-light');

  await page.getByRole('radio', { name: /^Dark/ }).click();
  expect(await theme(page)).toBe('bustandeen');
});

test('System follows the device', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/demo/sister');
  await expect(page.getByText('Demo Mode').first()).toBeVisible();
  expect(await theme(page)).toBe('bustandeen-light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect.poll(() => theme(page)).toBe('bustandeen');
});

test('the static landing stays dark when Light is saved', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('bustandeen_theme_mode', 'light');
    localStorage.setItem('bustandeen_theme', 'bustandeen-light');
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.hasAttribute('data-static'))).toBe(
    true
  );
  expect(await theme(page)).toBe('bustandeen');
});
