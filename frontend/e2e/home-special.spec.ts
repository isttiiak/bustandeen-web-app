import { expect, test, type Page } from '@playwright/test';

// Home: today's special days near the top (Settings → Home, utils/homeSpecial.ts).
// Default 'strip' sits between the prayer arch and the worship cards; 'pills'
// are chips inside the arch; 'full' moves the detailed block above the cards.
// Frozen clock in Dhaka: a Friday afternoon (hour of response on) and a Monday.

const FRIDAY_ASR = new Date('2026-10-16T16:45:00+06:00'); // 5 Jumādā al-Ūlā 1448
const MONDAY = new Date('2026-10-19T10:00:00+06:00'); // 8 Jumādā al-Ūlā 1448

async function demoHome(page: Page, at: Date, layout?: 'full' | 'strip' | 'pills') {
  await page.clock.setFixedTime(at);
  await page.context().addInitScript((l) => {
    localStorage.setItem(
      'bustandeen_location',
      JSON.stringify({ latitude: 23.81, longitude: 90.41, name: 'Dhaka' })
    );
    if (l) localStorage.setItem('bustandeen_home_special', l);
  }, layout);
  await page.goto('/');
  await page.getByRole('link', { name: /Explore as Brother/ }).click();
  await expect(page.getByText('Demo Mode')).toBeVisible();
}

const box = async (page: Page, selector: string) => {
  const b = await page.locator(selector).first().boundingBox();
  expect(b, selector).not.toBeNull();
  return b!;
};

test.beforeEach(async ({ context }) => {
  await context.route(
    (url) => url.hostname !== 'localhost',
    (route) => route.abort()
  );
});

test('Friday, default strip: hour of response first, between the arch and the worship cards', async ({
  page,
}) => {
  await demoHome(page, FRIDAY_ASR);
  const strip = page.getByTestId('today-highlights');
  await expect(strip).toHaveAttribute('data-variant', 'strip');
  await expect(strip.getByRole('button').first()).toContainText(/hour of response/i);
  await expect(strip.getByRole('link', { name: /Friday \(Jumu'ah\)/ })).toBeVisible();

  const arch = await box(page, '.rounded-arch');
  const s = await box(page, '[data-testid="today-highlights"]');
  const zikr = await box(page, '[data-testid="today-goals"] a[href="/zikr"]');
  expect(s.y).toBeGreaterThanOrEqual(arch.y + arch.height);
  expect(s.y + s.height).toBeLessThanOrEqual(zikr.y);
  // The detailed cards stay below the worship cards.
  const details = await box(page, '#today-special');
  expect(details.y).toBeGreaterThan(zikr.y);
  // ...without repeating the day already in the strip.
  await expect(page.locator('a[href="/special-day/friday"]')).toHaveCount(1);
});

test('Monday, default strip: the Sunnah fast row sits above the worship cards', async ({
  page,
}) => {
  await demoHome(page, MONDAY);
  const strip = page.getByTestId('today-highlights');
  await expect(strip.getByRole('link', { name: /Sunnah Fast Day/ })).toHaveAttribute(
    'href',
    '/special-day/fast_mon_thu'
  );
  const s = await box(page, '[data-testid="today-highlights"]');
  const zikr = await box(page, '[data-testid="today-goals"] a[href="/zikr"]');
  expect(s.y + s.height).toBeLessThanOrEqual(zikr.y);
});

test('Friday, minimal: chips inside the arch, and the arch still opens prayer times', async ({
  page,
}) => {
  await demoHome(page, FRIDAY_ASR, 'pills');
  const pills = page.locator('.rounded-arch [data-testid="today-highlights"]');
  await expect(pills).toHaveAttribute('data-variant', 'pills');
  await expect(pills.getByRole('link', { name: /Friday/ })).toHaveAttribute(
    'href',
    '/special-day/friday'
  );
  await expect(page.locator('a[aria-label="Prayer Times"]')).toHaveAttribute(
    'href',
    '/prayer-times'
  );
});

test('Monday, detailed: the full block sits above the worship cards', async ({ page }) => {
  await demoHome(page, MONDAY, 'full');
  await expect(page.getByTestId('today-highlights')).toHaveCount(0);
  const details = await box(page, '#today-special');
  const zikr = await box(page, '[data-testid="today-goals"] a[href="/zikr"]');
  expect(details.y + details.height).toBeLessThanOrEqual(zikr.y);
});
