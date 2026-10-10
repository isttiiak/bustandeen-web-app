import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

// Audit T2.6: the Arabic is the bundled Tanzil text, so the reader shows it
// with alquran.cloud unreachable, and a surah opened once reads offline.
// Every non-localhost request is aborted, as in the other specs.

// Expected text comes from the bundled file itself, never typed here.
const ikhlas = JSON.parse(
  readFileSync(new URL('../public/quran/uthmani/112.json', import.meta.url), 'utf8')
) as { ayahs: string[]; bismillah: string };
const firstAyah = `${ikhlas.bismillah} ${ikhlas.ayahs[0]}`;

test.beforeEach(async ({ context }) => {
  await context.route(
    (url) => url.hostname !== 'localhost',
    (route) => route.abort()
  );
});

async function enterDemo(page: Page) {
  await page.goto('/');
  await page.getByRole('link', { name: /Explore as Brother/ }).click();
  await expect(page.getByText('Demo Mode')).toBeVisible();
}

async function go(page: Page, path: string) {
  await page.evaluate((p) => {
    window.history.pushState({}, '', p);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);
  await expect(page).toHaveURL(new RegExp(`${path}$`));
}

test('the reader shows the Tanzil Arabic without alquran.cloud, credited', async ({ page }) => {
  await enterDemo(page);
  await go(page, '/quran/read/112');
  await expect(page.getByText(firstAyah, { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Tanzil' })).toHaveAttribute(
    'href',
    'https://tanzil.net'
  );
});

test('a surah opened once reads with no network', async ({ page, context }) => {
  test.setTimeout(60_000);
  // Let the service worker take control first: demo mode lives in memory, so
  // it has to be entered after the last full page load.
  await page.goto('/');
  // A cold install precaches the app shell; slow under parallel load.
  await expect
    .poll(() => page.evaluate(async () => (await navigator.serviceWorker.ready).active?.state), {
      timeout: 30_000,
    })
    .toBe('activated');
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await enterDemo(page);

  await go(page, '/quran/read/112');
  await expect(page.getByText(firstAyah, { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => caches.has('quran-uthmani'))).toBe(true);

  // Offline: leave and reopen the surah; its file now comes from the cache.
  await context.setOffline(true);
  await go(page, '/zikr');
  await go(page, '/quran/read/112');
  await expect(page.getByText(firstAyah, { exact: true })).toBeVisible();
  expect(await page.evaluate(async () => (await fetch('/quran/uthmani/112.json')).ok)).toBe(true);
  await context.setOffline(false);
});

test('a guest reads a surah without signing in, and is told nothing is saved (U9)', async ({
  page,
}) => {
  await page.goto('/quran/read/112');
  await expect(page.getByText(firstAyah, { exact: true })).toBeVisible();
  await expect(page.getByText(/reading as a guest/)).toBeVisible();
  await expect(page.getByText('Sign in required')).toHaveCount(0);
  // No bookmark or tafsir for a guest: both need an account.
  await expect(page.getByRole('button', { name: 'Bookmark this ayah' })).toHaveCount(0);
});
