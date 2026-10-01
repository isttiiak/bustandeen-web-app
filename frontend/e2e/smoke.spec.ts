import { expect, test, type Page } from '@playwright/test';

// Audit T2.2 smoke tests. Everything runs against the production build in
// demo mode: demo requests are answered in memory (src/lib/api.ts), so nothing
// here reaches a backend, Firebase or the live database.

// Only the app itself: third-party requests (fonts, analytics) are aborted so
// the tests are deterministic and send nothing anywhere.
test.beforeEach(async ({ context }) => {
  await context.route(
    (url) => url.hostname !== 'localhost',
    (route) => route.abort()
  );
});

/** Demo mode lives in memory only, so after entering it every move must be a
 * client-side navigation; a reload drops back to the landing page. */
async function enterDemo(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /Explore as Brother/ }).click();
  await expect(page.getByText('Demo Mode')).toBeVisible();
}

async function go(page: Page, path: string) {
  await page.evaluate((p) => {
    window.history.pushState({}, '', p);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);
  await expect(page).toHaveURL(new RegExp(`${path}$`));
}

const outbox = (page: Page) =>
  page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('bustandeen_salat_outbox') ?? '[]') as {
        kind: string;
        vars: { prayer?: string; status?: string };
      }[]
  );

test('a prerendered city page renders with its prayer times', async ({ page, request }) => {
  // The HTML itself (before any JavaScript) already carries the content.
  // (`vite preview` maps only the trailing-slash form to the folder's
  // index.html; Vercel serves the clean URL.)
  const html = await (await request.get('/prayer-times/dhaka-bangladesh/')).text();
  expect(html).toContain('Prayer Times in Dhaka');

  await page.goto('/prayer-times/dhaka-bangladesh');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Dhaka');
  for (const name of ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']) {
    await expect(page.getByText(new RegExp(`(^|\\s)${name}(\\s|$)`)).first()).toBeVisible();
  }
  // At least five clock times on the page.
  const times = await page.locator('body').innerText();
  expect(times.match(/\b\d{1,2}:\d{2}\b/g)?.length ?? 0).toBeGreaterThanOrEqual(5);
});

test('the service worker installs and serves the app offline', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect
    .poll(() => page.evaluate(async () => (await navigator.serviceWorker.ready).active?.state))
    .toBe('activated');

  // Once the worker controls the page, an app route opens with no network.
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.goto('/zikr');
  await expect(page.getByRole('heading', { name: /Zikr|Sign in/ }).first()).toBeVisible();
  await context.setOffline(false);
});

test('zikr taps are counted and survive leaving the page', async ({ page }) => {
  await enterDemo(page);
  await go(page, '/zikr');
  const count = page.getByTestId('zikr-count');
  await expect(count).toBeVisible();
  const before = Number(await count.innerText());

  const tap = page.getByRole('button', { name: 'Count', exact: true });
  for (let i = 0; i < 3; i++) await tap.click();
  await expect(count).toHaveText(String(before + 3));

  await go(page, '/salat');
  await go(page, '/zikr');
  await expect(page.getByTestId('zikr-count')).toHaveText(String(before + 3));
});

test('a prayer logged offline is queued, then synced on reconnect', async ({ page, context }) => {
  await enterDemo(page);
  await go(page, '/salat');
  const miss = page.getByRole('button', { name: /Miss/ }).first(); // Fajr
  await expect(miss).toBeVisible();
  expect(await outbox(page)).toEqual([]);

  await context.setOffline(true);
  await miss.click();
  await expect.poll(() => outbox(page)).toHaveLength(1);
  const [op] = await outbox(page);
  expect(op).toMatchObject({ kind: 'prayer', vars: { prayer: 'fajr', status: 'missed' } });

  await context.setOffline(false);
  await expect.poll(() => outbox(page), { timeout: 10_000 }).toEqual([]);
});

test('fonts are self-hosted: Latin, Arabic and Bangla faces load from the site itself', async ({
  page,
}) => {
  const fontHosts = new Set<string>();
  page.on('request', (r) => {
    if (r.resourceType() === 'font') fontHosts.add(new URL(r.url()).host);
  });
  await enterDemo(page);
  await go(page, '/zikr'); // English UI + Arabic dhikr text
  const loaded = await page.evaluate(async () => {
    await Promise.all([
      document.fonts.load('16px "Plus Jakarta Sans"', 'Bustandeen'),
      document.fonts.load('16px "Amiri"', 'سبحان الله'),
      document.fonts.load('16px "Hind Siliguri"', 'বুস্তানদীন'),
    ]);
    return {
      latin: document.fonts.check('16px "Plus Jakarta Sans"', 'Bustandeen'),
      arabic: document.fonts.check('16px "Amiri"', 'سبحان الله'),
      bangla: document.fonts.check('16px "Hind Siliguri"', 'বুস্তানদীন'),
    };
  });
  expect(loaded).toEqual({ latin: true, arabic: true, bangla: true });
  expect([...fontHosts]).toEqual(['localhost:4173']);
});
