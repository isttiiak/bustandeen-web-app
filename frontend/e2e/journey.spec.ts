import { expect, test, type Page } from '@playwright/test';

// v5.189.0: the Journey page (overview card per area + reset tracker), the
// Journey tab on Zikr / Quran / Fasting analytics, and suhoor + iftar on the
// Prayer Times arch. Demo mode (no resets yet, so every area says so).

test.use({ timezoneId: 'Asia/Dhaka' });

test.beforeEach(async ({ context }) => {
  await context.route(
    (url) => url.hostname !== 'localhost',
    (route) => route.abort()
  );
});

async function demoAt(page: Page, path: string, time = '2026-10-18T10:00:00+06:00') {
  await page.clock.setFixedTime(new Date(time));
  await page.context().addInitScript(() => {
    localStorage.setItem(
      'bustandeen_location',
      JSON.stringify({ latitude: 23.8103, longitude: 90.4125, name: 'Dhaka' })
    );
  });
  await page.goto('/demo/brother');
  await expect(page.getByText('Demo Mode').first()).toBeVisible();
  await page.evaluate((p) => {
    window.history.pushState({}, '', p);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);
}

test('Journey: one overview card per area, then the reset tracker', async ({ page }) => {
  await demoAt(page, '/journey');
  await expect(page.getByRole('heading', { name: 'Journey', level: 1 })).toBeVisible();
  for (const a of ['salat', 'zikr', 'quran', 'fasting']) {
    await expect(page.getByTestId(`overview-${a}`)).toBeVisible();
  }
  // Each card opens its analytics.
  await expect(page.getByTestId('overview-zikr')).toHaveAttribute('href', '/zikr/analytics');
  const tracker = page.getByTestId('reset-tracker');
  for (const row of ['zikr', 'salat', 'fasting', 'quran', 'kaza', 'all']) {
    await expect(tracker.getByTestId(`reset-tracker-${row}`)).toContainText('Never reset');
  }
  await expect(tracker.getByTestId('reset-tracker-kaza')).toContainText('Kaza debt');
  await expect(tracker.getByTestId('reset-tracker-all')).toContainText('Reset all stats');
});

for (const [path, area] of [
  ['/zikr/analytics', 'zikr'],
  ['/quran/analytics', 'quran'],
  ['/fasting/analytics', 'fasting'],
] as const) {
  test(`${path}: the Journey tab shows the ${area} card and its own resets`, async ({ page }) => {
    await demoAt(page, path);
    const tabs = page.getByTestId('analytics-view');
    await expect(tabs.getByRole('button', { name: 'Stats' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await tabs.getByRole('button', { name: 'Journey' }).click();
    const journey = page.getByTestId('area-journey');
    await expect(journey.getByTestId(`overview-${area}`)).toBeVisible();
    await expect(journey.getByTestId(`reset-tracker-${area}`)).toBeVisible();
    await expect(journey.getByTestId('reset-tracker-all')).toHaveCount(0);
  });
}

test('Salat Journey lists Salat and Kaza debt resets', async ({ page }) => {
  await demoAt(page, '/salat/analytics');
  await page.getByRole('button', { name: 'Journey' }).click();
  await expect(page.getByTestId('reset-tracker-salat')).toBeVisible();
  await expect(page.getByTestId('reset-tracker-kaza')).toBeVisible();
});

test("Prayer Times: today's suhoor and iftar until Maghrib, then tomorrow's", async ({ page }) => {
  await demoAt(page, '/prayer-times');
  const fast = page.getByTestId('prayer-fast-times');
  await expect(fast).toContainText("For today's fast");
  await expect(fast).toContainText('Suhoor ends');
  await expect(fast).toContainText('Iftar (Maghrib)');
  await expect(fast).toContainText(/\d{1,2}:\d{2}\s?[AP]M/);
});

test("Prayer Times after Maghrib: tomorrow's fast", async ({ page }) => {
  await demoAt(page, '/prayer-times', '2026-10-18T21:00:00+06:00');
  await expect(page.getByTestId('prayer-fast-times')).toContainText("For tomorrow's fast");
});
