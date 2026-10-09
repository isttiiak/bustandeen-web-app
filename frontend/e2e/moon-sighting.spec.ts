import { expect, test, type Page } from '@playwright/test';

// T4.1 (FEAT-03, FIQH-02): a national moon-sighting record moves the Hijri
// date for devices in that country on Automatic; the user's own choice wins.
// The record is a test fixture, not a real committee decision. The device's
// time zone is Asia/Dhaka (playwright.config.ts), so its country is BD.

const RECORD = {
  id: 'fixture-bd',
  country: 'BD',
  effectiveFrom: '2027-01-20',
  offset: -1,
  note: 'Test fixture',
};

test.beforeEach(async ({ context }) => {
  await context.route('**/api/calendar/moon-sighting', (route) =>
    route.fulfill({ json: { ok: true, records: [RECORD] } })
  );
  await context.route(
    (url) => url.hostname !== 'localhost' && !url.pathname.startsWith('/api/calendar/'),
    (route) => route.abort()
  );
});

async function demoSettings(page: Page) {
  // Umm al-Qura: 1 Ramaḍān 1448 = Mon 8 Feb 2027 (morning, before Maghrib)
  await page.clock.setFixedTime(new Date('2027-02-08T10:00:00+06:00'));
  await page.goto('/');
  await page.getByRole('link', { name: /Explore as Brother/ }).click();
  await expect(page.getByText('Demo Mode')).toBeVisible();
  await page.evaluate(() => {
    window.history.pushState({}, '', '/settings');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
}

test('Automatic follows the country record; picking Umm al-Qura overrides it', async ({ page }) => {
  await demoSettings(page);
  const auto = page.getByRole('button', { name: /^Automatic/ });
  await expect(auto).toHaveAttribute('aria-pressed', 'true');
  await expect(auto).toContainText("Following Bangladesh's moon sighting since");
  await expect(auto).toContainText('one day after Umm al-Qura');

  const today = page.getByText(/^Today:/);
  await expect(today).toContainText('30');
  await expect(today).toContainText('1448');
  await expect(today).not.toContainText(/Rama/);

  await page.getByRole('button', { name: 'Umm al-Qura', exact: true }).click();
  await expect(auto).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByText(/^Today:/)).toContainText(/1 Rama/);

  await auto.click();
  await expect(page.getByText(/^Today:/)).not.toContainText(/Rama/);
});
