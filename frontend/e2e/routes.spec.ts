import { expect, test, type Page } from '@playwright/test';

// Every route renders without hitting the error boundary, in demo mode (audit
// T2.4: the safety net for splitting App.tsx and the mega-components). Caught
// a real crash on its first run: /sadaqah in a fresh demo.

const ROUTES = [
  '/zikr',
  '/zikr/analytics',
  '/salat',
  '/salat/analytics',
  '/musafir',
  '/fasting',
  '/fasting/analytics',
  '/ramadan',
  '/ramadan/analytics',
  '/prayer-times',
  '/qibla',
  '/quran',
  '/quran/khatam',
  '/quran/browse',
  '/quran/listen',
  '/quran/analytics',
  '/quran/bookmarks',
  '/quran/hifz',
  '/quran/read/1',
  '/cycle',
  '/cycle/analytics',
  '/friends',
  '/connect/ABC123',
  '/settings',
  '/welcome',
  '/profile',
  '/special-day/ashura',
  '/naseeh',
  '/sadaqah',
  '/sadaqah/donate',
  '/sadaqah/thank-you',
  '/about',
  '/privacy',
  '/feedback',
  '/contact',
  '/library/duas',
  '/library/adhkar',
  '/library/asma-ul-husna',
  '/library/zakat-calculator',
  '/login',
  '/signup',
  '/admin',
  // Prerendered SEO routes, taken over by the client router
  '/prayer-times/dhaka-bangladesh',
  '/bn/qibla/dhaka-bangladesh',
  '/ar/ramadan-calendar/dhaka-bangladesh/2027',
  '/duas/travel',
  '/bn/adhkar/evening',
  '/hijri-date-converter',
  '/asma-ul-husna',
  '/zakat-calculator',
  '/no-such-page',
];

test.beforeEach(async ({ context }) => {
  await context.route(
    (url) => url.hostname !== 'localhost',
    (route) => route.abort()
  );
});

async function enterDemo(page: Page) {
  await page.goto('/');
  await page.getByRole('link', { name: /Explore as Sister/ }).click();
  await expect(page.getByText('Demo Mode')).toBeVisible();
}

test('every route renders in demo mode', async ({ page }) => {
  test.setTimeout(180_000);
  await enterDemo(page);
  const broken: string[] = [];
  for (const path of ROUTES) {
    await page.evaluate((p) => {
      window.history.pushState({}, '', p);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }, path);
    await page.waitForTimeout(700);
    const crashed = await page.evaluate(() =>
      document.body.innerText.includes('Something went wrong')
    );
    if (crashed) {
      broken.push(path);
      await enterDemo(page); // the error boundary sticks; start fresh
    }
  }
  expect(broken).toEqual([]);
});
