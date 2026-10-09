import { expect, test, type Page } from '@playwright/test';

// T3.4 follow-up (C): the Salat tracker shows the same adhkār card as Home on
// the prayer whose adhkār window is open (Fajr→sunrise on Fajr, Maghrib→ʿIshāʾ
// on Maghrib), and Salat settings can turn it off.

test.beforeEach(async ({ context }) => {
  await context.route(
    (url) => url.hostname !== 'localhost',
    (route) => route.abort()
  );
});

async function demoSalatAt(page: Page, at: string, adhkarOff = false) {
  await page.clock.setFixedTime(new Date(at));
  await page.context().addInitScript((off) => {
    localStorage.setItem(
      'bustandeen_location',
      JSON.stringify({ latitude: 23.81, longitude: 90.41, name: 'Dhaka' })
    );
    if (off) localStorage.setItem('bustandeen_salat_adhkar', '0');
  }, adhkarOff);
  await page.goto('/demo/brother');
  await expect(page.getByText('Demo Mode').first()).toBeVisible();
  // In-app navigation: a full page load would end demo mode.
  await page.evaluate(() => {
    window.history.pushState({}, '', '/salat');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
}

const adhkarLinks = (page: Page) => page.locator('a[href^="/library/adhkar?period="]');

test('Maghrib to ʿIshāʾ: the evening adhkār card is on the tracker', async ({ page }) => {
  await demoSalatAt(page, '2026-10-15T17:50:00+06:00');
  const card = adhkarLinks(page);
  await expect(card).toHaveCount(1);
  await expect(card).toHaveAttribute('href', '/library/adhkar?period=evening');
  await expect(card).toContainText('Ṣaḥīḥ Muslim 2723');
});

test('Fajr to sunrise: the morning card on Fajr', async ({ page }) => {
  await demoSalatAt(page, '2026-10-15T05:00:00+06:00');
  await expect(adhkarLinks(page)).toHaveAttribute('href', '/library/adhkar?period=morning');
});

test('outside both windows no adhkār card is shown', async ({ page }) => {
  await demoSalatAt(page, '2026-10-15T12:00:00+06:00');
  await expect(page.getByText('Maghrib').first()).toBeVisible();
  await expect(adhkarLinks(page)).toHaveCount(0);
});

test('Salat settings can turn the adhkār card off', async ({ page }) => {
  await demoSalatAt(page, '2026-10-15T17:50:00+06:00', true);
  await expect(page.getByText('Maghrib').first()).toBeVisible();
  await expect(adhkarLinks(page)).toHaveCount(0);
});
