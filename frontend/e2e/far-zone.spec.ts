import { expect, test, type Page } from '@playwright/test';

// Far-zone report, 2026-10-12: a phone on UK time with Dhaka as the saved
// location showed "Isha, ends in 4h 16m" after Fajr had begun in Dhaka. The
// day, the times and the clock now all follow the saved place (Dhaka), and
// the arch says "Dhaka time". (The "different time zone" card is hidden in
// demo mode; its logic is unit-tested in placeClock.test.ts.)

test.use({ timezoneId: 'Europe/London' });

test.beforeEach(async ({ context }) => {
  await context.route(
    (url) => url.hostname !== 'localhost',
    (route) => route.abort()
  );
});

async function demoAt(page: Page, at: string, path = '/demo/brother') {
  await page.clock.setFixedTime(new Date(at));
  await page.context().addInitScript(() => {
    localStorage.setItem(
      'bustandeen_location',
      JSON.stringify({ latitude: 23.81, longitude: 90.41, name: 'Dhaka' })
    );
  });
  await page.goto(path);
  await expect(page.getByText('Demo Mode').first()).toBeVisible();
}

const arch = (page: Page) => page.locator('.rounded-arch').first();

test('05:00 in Dhaka (00:00 in London): Fajr, on Dhaka time and date', async ({ page }) => {
  // Fajr in Dhaka on 12 Oct 2026 is ~04:39; London is still on the 11th.
  await demoAt(page, '2026-10-12T05:00:00+06:00');
  await expect(arch(page)).toContainText('Dhaka time');
  await expect(arch(page)).toContainText(/Mon, Oct 12/);
  await expect(arch(page)).toContainText('Fajr');
  await expect(arch(page)).not.toContainText(/Ends at Fajr|Best until/);
  // Sunrise ends Fajr: shown on Dhaka's clock, not London's (00:5x).
  await expect(arch(page)).toContainText(/ends 05:5\d AM/i);
});

test('Prayer Times page: Dhaka clock and times, no stale Isha', async ({ page }) => {
  await demoAt(page, '2026-10-12T05:00:00+06:00');
  await page.evaluate(() => {
    window.history.pushState({}, '', '/prayer-times');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  const clock = arch(page);
  await expect(clock).toContainText(/05:00:\d\d AM/);
  await expect(clock).toContainText('Dhaka time');
  await expect(clock).toContainText(/Monday, October 12, 2026/);
  await expect(clock).toContainText('Fajr');
  await expect(clock).not.toContainText('Isha');
});
