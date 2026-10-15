import { expect, test, type Page } from '@playwright/test';

// The Islamic calendar (Library): the month grid follows the country's
// moon-sighting record, the events and the settings drawer. The device's time
// zone is Asia/Dhaka (playwright.config.ts), so its country is Bangladesh.
// Record fixture: Jumādā al-Ūlā 1448 began 13 Oct 2026 in Bangladesh (a day
// after Umm al-Qura's 12 Oct, as the real committee announced).

const BD_JUMADA = {
  id: 'fixture-bd-5',
  country: 'BD',
  hijriYear: 1448,
  hijriMonth: 5,
  startDate: '2026-10-13',
  effectiveFrom: '2026-10-12',
  offset: -1,
  note: 'Test fixture',
};

test.beforeEach(async ({ context }) => {
  await context.route('**/api/calendar/moon-sighting', (route) =>
    route.fulfill({ json: { ok: true, records: [BD_JUMADA] } })
  );
  await context.route(
    (url) => url.hostname !== 'localhost' && !url.pathname.startsWith('/api/calendar/'),
    (route) => route.abort()
  );
});

async function openCalendar(page: Page, at = '2026-10-15T10:00:00+06:00') {
  await page.clock.setFixedTime(new Date(at));
  await page.goto('/demo/brother');
  await expect(page.getByText('Demo Mode')).toBeVisible();
  await page.evaluate(() => {
    window.history.pushState({}, '', '/library/calendar');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page.getByTestId('calendar-grid')).toBeVisible();
}

const cell = (page: Page, ymd: string) => page.locator(`[data-day="${ymd}"]`);

test('today and the month follow the Bangladesh record', async ({ page }) => {
  await openCalendar(page);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('3 Jumādā al-Ūlā 1448 AH');
  await expect(page.getByTestId('calendar-source')).toHaveText(/Announced in Bangladesh/);
  await expect(page.getByTestId('calendar-month')).toHaveText('October 2026');
  // 12 Oct is still 30 Rabīʿ al-Ākhir; 13 Oct is the 1st (marked)
  await expect(cell(page, '2026-10-12')).toHaveAttribute('aria-label', /30 Rab/);
  await expect(cell(page, '2026-10-13')).toHaveAttribute('aria-label', /1 Jumādā al-Ūlā 1448/);
  await expect(cell(page, '2026-10-15')).toHaveAttribute('aria-current', 'date');
  await expect(page.getByTestId('calendar-status')).toContainText(
    'Jumādā al-Ūlā: announced, began Oct 13'
  );
  // Coming up: the Durga Puja holidays (a government holiday)
  await expect(page.getByTestId('calendar-coming')).toContainText('Government holiday');
  await expect(page.getByTestId('calendar-coming')).toContainText('Durga Puja');
  // No event today, so no strip
  await expect(page.getByTestId('calendar-today-events')).toHaveCount(0);
});

test('a holiday shows in the strip, in red, and in the lists', async ({ page }) => {
  await openCalendar(page, '2026-10-21T10:00:00+06:00');
  await expect(page.getByTestId('calendar-today-events')).toContainText(
    'Government holiday: Durga Puja (Bijoya Dashami)'
  );
  await expect(cell(page, '2026-10-21').locator('span').first()).toHaveClass(/text-red-400/);
  await expect(page.getByTestId('calendar-this-month')).toContainText('Durga Puja (Mahanabami)');
  // White Days in Bangladesh: 13-15 Jumādā al-Ūlā = 25-27 Oct
  await cell(page, '2026-10-25').click();
  await expect(page.getByTestId('calendar-day')).toContainText('Ayyām al-Bīḍ');
  await expect(page.getByTestId('calendar-day')).toContainText('13 Jumādā al-Ūlā 1448 AH');
  // Not in the next 30 days list (it comes every month)
  await expect(page.getByTestId('calendar-next-30')).not.toContainText('Ayyām al-Bīḍ');
  await expect(page.getByTestId('calendar-next-30')).toContainText('Durga Puja holiday');
});

test('the Hijri grid shows a whole Hijri month and steps to the next', async ({ page }) => {
  await openCalendar(page);
  await page.getByRole('button', { name: 'Hijri', exact: true }).click();
  await expect(page.getByTestId('calendar-month')).toHaveText('Jumādā al-Ūlā 1448 AH');
  const days = page.locator('[data-day]');
  await expect(days).toHaveCount(30);
  await expect(days.first()).toHaveAttribute('data-day', '2026-10-13');
  await page.getByRole('button', { name: 'Next month' }).click();
  await expect(page.getByTestId('calendar-month')).toHaveText('Jumādā al-Ākhirah 1448 AH');
  await expect(days.first()).toHaveAttribute('data-day', '2026-11-12');
});

test('settings: the Bengali calendar in Bangla, the weekend and the order', async ({ page }) => {
  await openCalendar(page);
  // Bangladesh: Friday and Saturday off
  await expect(cell(page, '2026-10-16')).toHaveAttribute('aria-label', /Weekend/);
  await expect(cell(page, '2026-10-18')).not.toHaveAttribute('aria-label', /Weekend/);

  await page.getByRole('button', { name: 'Calendar settings' }).click();
  const sheet = page.getByTestId('calendar-settings');
  await sheet.getByRole('checkbox', { name: /Bengali/ }).click();
  await sheet.getByRole('button', { name: 'Sunday', exact: true }).first().click();
  await sheet.getByRole('button', { name: 'Close calendar settings' }).click();

  // 17 Oct 2026 = 1 Kartik 1433, in Bangla digits
  await expect(cell(page, '2026-10-17')).toContainText('১');
  await expect(cell(page, '2026-10-15')).toHaveAttribute('aria-label', /৩০ আশ্বিন ১৪৩৩ বঙ্গাব্দ/);
  await expect(cell(page, '2026-10-18')).toHaveAttribute('aria-label', /Weekend/);
  expect(await page.evaluate(() => localStorage.getItem('bustandeen_calendar_layers'))).toBe(
    'greg,hijri,bn'
  );
});

test('with a saved place, the Hijri date in the prayer arch opens the calendar', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'bustandeen_location',
      JSON.stringify({ latitude: 23.81, longitude: 90.41, name: 'Dhaka' })
    );
  });
  await page.clock.setFixedTime(new Date('2026-10-15T10:00:00+06:00'));
  await page.goto('/demo/brother');
  await expect(page.getByText('Demo Mode')).toBeVisible();
  // The arch itself opens Prayer Times; its Hijri date opens the calendar
  await page
    .getByRole('link', { name: /Jumādā al-Ūlā 1448/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/library\/calendar$/);
  await expect(page.getByTestId('calendar-month')).toHaveText('October 2026');
  await expect(page.getByTestId('calendar-coming')).toBeVisible();
});

test('after Maghrib the arch shows the new Hijri date, like Home', async ({ page }) => {
  // 15 Oct 2026, 8 pm in Dhaka: Maghrib (about 5:32 pm) has passed, so the
  // Islamic day is 4 Jumādā al-Ūlā on Home, in Settings and in the arch.
  await page.addInitScript(() => {
    localStorage.setItem(
      'bustandeen_location',
      JSON.stringify({ latitude: 23.81, longitude: 90.41, name: 'Dhaka' })
    );
  });
  await page.clock.setFixedTime(new Date('2026-10-15T20:00:00+06:00'));
  await page.goto('/demo/brother');
  await expect(page.getByText('Demo Mode')).toBeVisible();
  await expect(page.getByRole('link', { name: /4 Jumādā al-Ūlā 1448/ }).first()).toBeVisible();
  await page
    .getByRole('link', { name: /4 Jumādā al-Ūlā 1448/ })
    .first()
    .click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('4 Jumādā al-Ūlā 1448 AH');
  await expect(page.getByTestId('calendar-change')).toContainText('Date changed');
  await expect(page.getByTestId('calendar-change')).toContainText('4 Jumādā al-Ūlā');
  // The grid keeps daytime dates: 15 Oct is still 3 Jumādā al-Ūlā
  await expect(page.locator('[data-day="2026-10-15"]')).toHaveAttribute(
    'aria-label',
    /3 Jumādā al-Ūlā 1448/
  );
});

test('the Hijri date on Home opens the calendar', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-15T10:00:00+06:00'));
  await page.goto('/demo/brother');
  await expect(page.getByText('Demo Mode')).toBeVisible();
  await page
    .getByRole('link', { name: /Jumādā al-Ūlā 1448/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/library\/calendar$/);
  await expect(page.getByTestId('calendar-grid')).toBeVisible();
});

test('browsing stops at next year, notes a missing holiday list, links the source', async ({
  page,
}) => {
  await openCalendar(page);
  const next = page.getByRole('button', { name: 'Next month' });
  const prev = page.getByRole('button', { name: 'Previous month' });
  await expect(page.getByTestId('calendar-moon-note')).toContainText(
    'Dates that depend on the moon may differ by a day'
  );
  await expect(page.getByTestId('calendar-holidays-missing')).toHaveCount(0);
  // October 2026 -> January 2027: no 2027 list yet
  for (let i = 0; i < 3; i++) await next.click();
  await expect(page.getByTestId('calendar-month')).toHaveText('January 2027');
  await expect(page.getByTestId('calendar-holidays-missing')).toHaveText(
    'Government holidays for 2027 are not published yet.'
  );
  // ... to December 2027, the last month
  for (let i = 0; i < 11; i++) await next.click();
  await expect(page.getByTestId('calendar-month')).toHaveText('December 2027');
  await expect(next).toBeDisabled();
  // Back to January 2025, the first month
  for (let i = 0; i < 35; i++) await prev.click();
  await expect(page.getByTestId('calendar-month')).toHaveText('January 2025');
  await expect(prev).toBeDisabled();

  await page.getByRole('button', { name: 'Calendar settings' }).click();
  const sources = page.getByTestId('calendar-holiday-sources').getByRole('link');
  await expect(sources.first()).toHaveAttribute('href', /^https:\/\/bangla\.thedailystar\.net\//);
});
