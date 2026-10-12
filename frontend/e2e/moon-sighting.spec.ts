import { expect, test, type Page } from '@playwright/test';

// T4.1 (FEAT-03, FIQH-02): national month-start moon-sighting records move
// the Hijri date for devices in that country on Automatic; the user's own
// choice wins. Records are test fixtures, not real committee decisions. The
// device's time zone is Asia/Dhaka (playwright.config.ts), so its country is
// BD. Umm al-Qura 1448: 1 Sha'ban = 9 Jan 2027, 1 Ramadan = 8 Feb, Eid = 9 Mar.

const rec = (hijriMonth: number, startDate: string) => ({
  id: `fixture-bd-${hijriMonth}`,
  country: 'BD',
  hijriYear: 1448,
  hijriMonth,
  startDate,
  effectiveFrom: startDate,
  offset: -1,
  note: 'Test fixture',
});
// Sha'ban and Ramadan a day after Umm al-Qura; Ramadan of 30 days (Eid 11 Mar)
const RECORDS = [rec(8, '2027-01-10'), rec(9, '2027-02-09'), rec(10, '2027-03-11')];

test.beforeEach(async ({ context }) => {
  await context.route('**/api/calendar/moon-sighting', (route) =>
    route.fulfill({ json: { ok: true, records: RECORDS } })
  );
  await context.route(
    (url) => url.hostname !== 'localhost' && !url.pathname.startsWith('/api/calendar/'),
    (route) => route.abort()
  );
});

async function demoSettings(page: Page, at = '2027-02-08T10:00:00+06:00') {
  // Default: Umm al-Qura's 1 Ramaḍān 1448, Mon 8 Feb 2027 (morning, before Maghrib)
  await page.clock.setFixedTime(new Date(at));
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

test("a 30th of Ramadan after Umm al-Qura's 29-day month (not Eid)", async ({ page }) => {
  // 10 Mar 2027: Umm al-Qura's 2 Shawwal; Bangladesh's 30th fast
  await demoSettings(page, '2027-03-10T10:00:00+06:00');
  const today = page.getByText(/^Today:/);
  await expect(today).toContainText('30');
  await expect(today).toContainText(/Rama/);
  await expect(today).toContainText('1448');
});

test('a record that arrives after the first paint redraws Home without a reload', async ({
  page,
}) => {
  // 12 Oct 2026: Umm al-Qura's 1 Jumādā al-Ūlā; BD's record starts it on 13 Oct.
  // Hold the records back until Home has drawn the Umm al-Qura date.
  let release: () => void = () => {};
  const held = new Promise<void>((r) => (release = r));
  await page.route('**/api/calendar/moon-sighting', async (route) => {
    await held;
    await route.fulfill({ json: { ok: true, records: [rec(5, '2026-10-13')] } });
  });
  await page.clock.setFixedTime(new Date('2026-10-12T10:00:00+06:00'));
  await page.goto('/');
  await page.getByRole('link', { name: /Explore as Brother/ }).click();
  await expect(page.getByText('Demo Mode')).toBeVisible();
  await expect(page.getByText(/1 Jumādā al-Ūlā 1448/).first()).toBeVisible();

  release();
  await expect(page.getByText(/30 Rab[īi]['ʿ] al-[ĀA]khir 1448/).first()).toBeVisible();
});
