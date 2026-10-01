import { expect, test, type Page, type Route } from '@playwright/test';

// Audit T2.3 acceptance: for each tracker, a change made offline is queued
// in the sync outbox and delivered once the connection returns. Demo mode,
// production build; nothing leaves the machine.

interface QueuedOp {
  tracker: string;
  method: string;
  url: string;
  body?: Record<string, unknown>;
}

test.beforeEach(async ({ context }) => {
  await context.route(
    (url) => url.hostname !== 'localhost',
    (route) => route.abort()
  );
});

async function enterDemo(page: Page, as: 'Brother' | 'Sister') {
  await page.goto('/');
  await page.getByRole('button', { name: new RegExp(`Explore as ${as}`) }).click();
  await expect(page.getByText('Demo Mode')).toBeVisible();
}

async function go(page: Page, path: string) {
  await page.evaluate((p) => {
    window.history.pushState({}, '', p);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);
  await expect(page).toHaveURL(new RegExp(`${path}$`));
}

const queue = (page: Page) =>
  page.evaluate(
    () => JSON.parse(localStorage.getItem('bustandeen_sync_outbox') ?? '[]') as QueuedOp[]
  );

async function expectDrainsOnReconnect(
  page: Page,
  context: import('@playwright/test').BrowserContext
) {
  await context.setOffline(false);
  await expect.poll(() => queue(page), { timeout: 10_000 }).toEqual([]);
}

test('fasting: a fast logged offline is queued, then synced', async ({ page, context }) => {
  await enterDemo(page, 'Brother');
  await go(page, '/fasting');
  const fasted = page.getByRole('button', { name: /I fasted today/ });
  await expect(fasted).toBeVisible();

  await context.setOffline(true);
  await fasted.click();
  await expect.poll(() => queue(page)).toHaveLength(1);
  const [op] = await queue(page);
  expect(op).toMatchObject({
    tracker: 'fasting',
    method: 'put',
    url: '/api/fasting/log',
    body: { status: 'completed' },
  });

  await expectDrainsOnReconnect(page, context);
});

test('Rayhanah: a period start saved offline is queued once, then synced', async ({
  page,
  context,
}) => {
  await enterDemo(page, 'Sister');
  await go(page, '/cycle');
  await page.getByRole('button', { name: /My period started/ }).click();
  const begin = page.getByRole('button', { name: 'Begin Rayhanah days' });
  await expect(begin).toBeVisible();

  await context.setOffline(true);
  await begin.click();
  await expect(begin).toBeHidden(); // the dialog closes: saved on the device
  await expect.poll(() => queue(page)).toHaveLength(1);
  const [op] = await queue(page);
  expect(op).toMatchObject({
    tracker: 'cycle',
    method: 'post',
    url: '/api/cycle/start',
    body: { type: 'hayd' },
  });

  await expectDrainsOnReconnect(page, context);
});

// Placeholder text only: the reader needs SOMETHING to show, and real Quran
// text must never be invented, so the fixture is plainly not Quran.
async function serveFixtureSurah(page: Page) {
  await page.route('https://api.alquran.cloud/v1/surah', (route: Route) =>
    route.fulfill({
      json: {
        data: [
          {
            number: 1,
            name: 'Test surah',
            englishName: 'Test surah',
            englishNameTranslation: 'Test',
            numberOfAyahs: 7,
            revelationType: 'Meccan',
          },
        ],
      },
    })
  );
  await page.route('https://api.alquran.cloud/v1/surah/1/editions/**', (route: Route) => {
    const editions = new URL(route.request().url()).pathname.split('/').pop()!.split(',');
    const ayahs = Array.from({ length: 7 }, (_, i) => ({
      number: i + 1,
      numberInSurah: i + 1,
      text: `Placeholder line ${i + 1}`,
    }));
    return route.fulfill({ json: { data: editions.map(() => ({ ayahs })) } });
  });
}

test('Quran: āyāt read offline are queued once each, then synced', async ({ page, context }) => {
  await serveFixtureSurah(page);
  await enterDemo(page, 'Brother');
  await go(page, '/quran/read/1');
  const next = page.getByRole('button', { name: 'Next ayah' });
  await expect(page.getByText('Placeholder line 1').first()).toBeVisible();

  await context.setOffline(true);
  for (let i = 0; i < 3; i++) await next.click();
  // Leaving the reader flushes the āyāt read so far.
  await go(page, '/zikr');
  await expect
    .poll(async () => (await queue(page)).filter((o) => o.url === '/api/quran/read-ayat'))
    .toHaveLength(1);
  const read = (await queue(page)).find((o) => o.url === '/api/quran/read-ayat')!;
  expect(read).toMatchObject({ tracker: 'quran', method: 'post', body: { count: 3, surah: 1 } });

  await expectDrainsOnReconnect(page, context);
});
