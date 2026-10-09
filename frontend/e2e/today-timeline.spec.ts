import { expect, test, type Page } from '@playwright/test';

// T3.4 Home "Today" timeline (components/home/TodayTimeline.tsx). Frozen clock
// in Dhaka with a saved location. The demo log has Fajr-Maghrib Done and ʿIshāʾ
// pending. Adhkār windows: Fajr→sunrise, ʿAṣr→Maghrib (Quran 50:39).

async function demoHomeAt(page: Page, at: string, dayStartMode?: string) {
  await page.clock.setFixedTime(new Date(at));
  await page.context().addInitScript((mode) => {
    localStorage.setItem(
      'bustandeen_location',
      JSON.stringify({ latitude: 23.81, longitude: 90.41, name: 'Dhaka' })
    );
    if (mode) localStorage.setItem('bustandeen_day_start_mode', mode);
  }, dayStartMode);
  await page.goto('/');
  await page.getByRole('link', { name: /Explore as Brother/ }).click();
  await expect(page.getByText('Demo Mode')).toBeVisible();
}

const row = (page: Page, id: string) =>
  page.getByTestId('today-timeline').locator(`[data-prayer="${id}"]`);

test.beforeEach(async ({ context }) => {
  await context.route(
    (url) => url.hostname !== 'localhost',
    (route) => route.abort()
  );
});

test('evening: ʿIshāʾ is current with Mark Done; statuses and times are listed', async ({
  page,
}) => {
  await demoHomeAt(page, '2026-10-15T20:00:00+06:00');
  const timeline = page.getByTestId('today-timeline');
  await expect(timeline.locator('[data-prayer]')).toHaveCount(5);
  for (const id of ['fajr', 'dhuhr', 'asr', 'maghrib']) {
    await expect(row(page, id)).toContainText('Done');
  }
  await expect(row(page, 'isha')).toHaveAttribute('data-prayer', 'isha');
  await expect(row(page, 'isha').locator('[aria-current="time"]')).toBeVisible();
  await expect(row(page, 'isha').getByRole('button', { name: 'Mark Done' })).toBeVisible();
  await expect(row(page, 'isha').getByRole('link', { name: 'Open Salat' })).toBeVisible();
  // Only the current prayer gets actions.
  await expect(timeline.getByRole('button', { name: 'Mark Done' })).toHaveCount(1);
  // Clicking writes through the normal salat path without breaking Home.
  await row(page, 'isha').getByRole('button', { name: 'Mark Done' }).click();
  await expect(page.getByTestId('today-goals')).toBeVisible();
});

test('after ʿAṣr: the evening adhkār card is open and opens the evening list', async ({ page }) => {
  await demoHomeAt(page, '2026-10-15T16:45:00+06:00');
  const evening = row(page, 'asr').getByRole('link', { name: /Evening adhkār/ });
  await expect(evening).toContainText(/Now, until/);
  await expect(evening).toContainText('Quran 50:39');
  await expect(row(page, 'fajr').getByRole('link', { name: /Morning adhkār/ })).toContainText(
    'From Fajr until sunrise'
  );
  await evening.click();
  await expect(page).toHaveURL(/\/library\/adhkar\?period=evening$/);
  await expect(page.getByRole('button', { name: /Evening/ }).first()).toHaveAttribute(
    'aria-pressed',
    'true'
  );
});

test('after sunrise the morning card is closed; after Maghrib the evening one is', async ({
  page,
}) => {
  await demoHomeAt(page, '2026-10-15T18:10:00+06:00');
  await expect(row(page, 'asr').getByRole('link', { name: /Evening adhkār/ })).toContainText(
    'From ʿAṣr until Maghrib'
  );
  await expect(row(page, 'fajr').getByRole('link', { name: /Morning adhkār/ })).not.toContainText(
    'Now, until'
  );
});

test('maghrib day-start mode: no Mark Done on Home, the Salat link stays', async ({ page }) => {
  await demoHomeAt(page, '2026-10-15T20:00:00+06:00', 'maghrib');
  await expect(row(page, 'isha').getByRole('link', { name: 'Open Salat' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mark Done' })).toHaveCount(0);
});
