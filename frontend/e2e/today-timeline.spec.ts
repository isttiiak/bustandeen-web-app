import { expect, test, type Page } from '@playwright/test';

// T3.4 Home "Today" timeline (components/home/TodayTimeline.tsx). Frozen clock
// in Dhaka with a saved location. The demo log has Fajr, Ẓuhr and Maghrib Done,
// ʿAṣr and ʿIshāʾ unmarked. Adhkār cards only while open: morning on Fajr (Fajr→sunrise,
// Quran 50:39), evening on Maghrib (Maghrib→ʿIshāʾ, Ṣaḥīḥ Muslim 2723).

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
  for (const id of ['fajr', 'dhuhr', 'maghrib']) {
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

test('after ʿAṣr there is no adhkār card; Maghrib carries the evening one', async ({ page }) => {
  await demoHomeAt(page, '2026-10-15T16:45:00+06:00');
  await expect(page.getByRole('link', { name: /adhkār/ })).toHaveCount(0);
});

test('Maghrib to ʿIshāʾ: evening adhkār on the Maghrib card, cited Muslim 2723', async ({
  page,
}) => {
  await demoHomeAt(page, '2026-10-15T17:50:00+06:00');
  const evening = row(page, 'maghrib').getByRole('link', { name: /Evening adhkār/ });
  await expect(evening).toContainText(/Now, until/);
  await expect(evening).toContainText('Ṣaḥīḥ Muslim 2723');
  await expect(page.getByRole('link', { name: /adhkār/ })).toHaveCount(1);
  await evening.click();
  await expect(page).toHaveURL(/\/library\/adhkar\?period=evening$/);
  await expect(page.getByRole('button', { name: /Evening/ }).first()).toHaveAttribute(
    'aria-pressed',
    'true'
  );
});

test('Fajr to sunrise: morning adhkār on the Fajr card, gone after sunrise', async ({ page }) => {
  await demoHomeAt(page, '2026-10-15T05:00:00+06:00');
  await expect(row(page, 'fajr').getByRole('link', { name: /Morning adhkār/ })).toContainText(
    'Quran 50:39'
  );
});

test('after sunrise and after ʿIshāʾ no adhkār card is shown', async ({ page }) => {
  await demoHomeAt(page, '2026-10-15T20:00:00+06:00');
  await expect(page.getByRole('link', { name: /adhkār/ })).toHaveCount(0);
});

test('Settings can turn the adhkār cards off', async ({ page }) => {
  await page.context().addInitScript(() => localStorage.setItem('bustandeen_home_adhkar', '0'));
  await demoHomeAt(page, '2026-10-15T17:50:00+06:00');
  await expect(row(page, 'maghrib')).toBeVisible();
  await expect(page.getByRole('link', { name: /adhkār/ })).toHaveCount(0);
});

test('Kaza: an unmarked prayer whose time is over gets one-tap Kaza, never ʿIshāʾ', async ({
  page,
}) => {
  await demoHomeAt(page, '2026-10-15T20:00:00+06:00');
  const kaza = page.getByRole('button', { name: /as Kaza/ });
  await expect(kaza).toHaveCount(1);
  await expect(row(page, 'asr').getByRole('button', { name: 'Mark Asr as Kaza' })).toBeVisible();
  await expect(row(page, 'isha').getByRole('button', { name: /as Kaza/ })).toHaveCount(0);
  await row(page, 'asr')
    .getByRole('button', { name: /as Kaza/ })
    .click();
  await expect(page.getByTestId('today-goals')).toBeVisible();
});

test('Kaza: not while ʿAṣr is still on, and not before Fajr for ʿIshāʾ', async ({ page }) => {
  await demoHomeAt(page, '2026-10-15T16:45:00+06:00');
  await expect(row(page, 'asr').getByRole('button', { name: 'Mark Done' })).toBeVisible();
  await expect(page.getByRole('button', { name: /as Kaza/ })).toHaveCount(0);
});

test('Kaza: not in maghrib day-start mode (that day is the next one)', async ({ page }) => {
  await demoHomeAt(page, '2026-10-15T20:00:00+06:00', 'maghrib');
  await expect(page.getByRole('button', { name: /as Kaza/ })).toHaveCount(0);
});

test('maghrib day-start mode: no Mark Done on Home, the Salat link stays', async ({ page }) => {
  await demoHomeAt(page, '2026-10-15T20:00:00+06:00', 'maghrib');
  await expect(row(page, 'isha').getByRole('link', { name: 'Open Salat' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mark Done' })).toHaveCount(0);
});

test('arch prayer row: statuses as steps, opens Salat; stays when the timeline is off', async ({
  page,
}) => {
  await page.context().addInitScript(() => localStorage.setItem('bustandeen_home_timeline', '0'));
  await demoHomeAt(page, '2026-10-15T20:00:00+06:00');
  await expect(page.getByTestId('today-timeline')).toHaveCount(0);
  const archRow = page.getByTestId('arch-prayer-row');
  await expect(archRow).toBeVisible();
  await expect(archRow.locator('li')).toHaveCount(5);
  await expect(archRow).toContainText('Fajr');
  await archRow.click();
  await expect(page).toHaveURL(/\/salat$/);
});
