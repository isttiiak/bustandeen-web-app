import { expect, test } from '@playwright/test';

// After a deploy an open app asks for a lazy chunk that no longer exists.
// staleChunkReload reloads ONCE for that chunk; if it is still missing, the
// ErrorBoundary offers "A new version is ready" instead of a reload loop or
// a generic error. Service workers are blocked so the chunk really fails
// (the precache would otherwise serve it).

test.use({ serviceWorkers: 'block' });

test.beforeEach(async ({ context }) => {
  await context.route(
    (url) => url.hostname !== 'localhost',
    (route) => route.abort()
  );
});

test('a missing lazy chunk reloads once, then offers Update', async ({ page, context }) => {
  await context.route(/\/assets\/About-[\w-]+\.js$/, (route) =>
    route.fulfill({ status: 404, body: '' })
  );
  let loads = 0;
  page.on('load', () => loads++);

  await page.goto('/zikr');
  await expect(page.getByTestId('zikr-count')).toBeVisible();
  await page.evaluate(() => {
    window.history.pushState({}, '', '/about');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });

  await expect(page.getByRole('heading', { name: 'A new version is ready' })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole('button', { name: 'Update' })).toBeEnabled();
  expect(loads).toBe(2); // the first visit + exactly one automatic reload
  const reloaded = await page.evaluate(() => sessionStorage.getItem('bustandeen_chunk_reloads'));
  expect(reloaded).toMatch(/About-[\w-]+\.js/);
});
