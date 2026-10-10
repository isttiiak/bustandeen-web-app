import { expect, test } from '@playwright/test';

// 2026-10-11 incident: a browser precached the previous build's app shell
// under the new revision key, so every load asked for main-*.js files that
// no longer existed and the app stayed blank until the next deploy. Online,
// the service worker now takes the shell from the network; the precached
// copy is only the offline fallback.

test.beforeEach(async ({ context }) => {
  await context.route(
    (url) => url.hostname !== 'localhost',
    (route) => route.abort()
  );
});

test('a poisoned precached shell cannot blank the app while online', async ({ page }) => {
  await page.goto('/zikr');
  await expect(page.getByTestId('zikr-count')).toBeVisible();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, {
    timeout: 15_000,
  });

  const poisoned = await page.evaluate(async () => {
    const stale =
      '<!doctype html><html><body><div id="root"></div>' +
      '<script type="module" src="/assets/main-gone0000.js"></script></body></html>';
    let hits = 0;
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const request of await cache.keys()) {
        if (request.url.includes('app-shell.html')) {
          await cache.put(
            request,
            new Response(stale, { headers: { 'content-type': 'text/html' } })
          );
          hits++;
        }
      }
    }
    return hits;
  });
  expect(poisoned).toBeGreaterThan(0);

  await page.reload();
  await expect(page.getByTestId('zikr-count')).toBeVisible();
});
