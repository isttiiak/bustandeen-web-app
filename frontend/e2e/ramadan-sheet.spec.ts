import { expect, test, type Page } from '@playwright/test';

// Audit R12: a town without a prerendered Ramadan page prints its own sheet
// from the app. Keighley (West Yorkshire) has no page. The phone is on Dhaka
// time (playwright.config), so the sheet must use the UK clock. Ramadan 1448
// by Umm al-Qura: first fast 8 Feb 2027; sehri 06:04 AM and iftar 05:06 PM in
// Keighley (Moonsighting Committee + the UK calibration, seo/utils/calc.ts).
// window.print is stubbed, so the sheet stays drawn and page.pdf prints it.

const KEIGHLEY = { latitude: 53.87, longitude: -1.91, name: 'Keighley, United Kingdom' };

test.beforeEach(async ({ context }) => {
  await context.route(
    (url) => url.hostname !== 'localhost',
    (route) => route.abort()
  );
  await context.addInitScript((place) => {
    localStorage.setItem('bustandeen_location', JSON.stringify(place));
    (window as unknown as { __prints: number }).__prints = 0;
    window.print = () => {
      (window as unknown as { __prints: number }).__prints++;
    };
  }, KEIGHLEY);
});

/** Pages in a PDF (each page object has /Type /Page). */
const pdfPages = (pdf: Buffer) =>
  (pdf.toString('latin1').match(/\/Type\s*\/Page(?!s)/g) ?? []).length;

async function printSheet(page: Page) {
  await page
    .getByRole('button', { name: "Download this Ramadan's timetable for Keighley" })
    .click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __prints: number }).__prints))
    .toBe(1);
  const sheet = page.getByTestId('ramadan-print');
  await expect(sheet).toHaveCount(1);
  return sheet;
}

test('demo user in a town without a page: one A4 page, the right first row', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-17T10:00:00+06:00'));
  await page.goto('/demo/brother');
  await expect(page.getByText('Demo Mode')).toBeVisible();
  await page.evaluate(() => {
    window.history.pushState({}, '', '/ramadan');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  const sheet = await printSheet(page);

  await expect(sheet).toContainText('Ramadan 1448 AH timetable: Keighley');
  const first = sheet.locator('tbody tr[data-date]').first();
  await expect(first).toHaveAttribute('data-date', '2027-02-08');
  await expect(first.locator('th')).toHaveText('1');
  await expect(first.locator('td').nth(1)).toHaveText('06:04 AM');
  await expect(first.locator('td').nth(2)).toHaveText('05:06 PM');
  // 29 fasts by Umm al-Qura, and the possible 30th.
  await expect(sheet.locator('tbody tr[data-date]')).toHaveCount(30);
  await expect(sheet).toContainText('If Ramadan has 30 days');
  await expect(sheet.locator('[data-sheet-footer]')).toContainText(
    'Times for Keighley, United Kingdom (53.87° N, 1.91° W)'
  );
  // The UK calibration is iftar only, against a masjid, not a national table.
  await expect(sheet.locator('[data-sheet-footer]')).toContainText(
    "Iftar checked against East London Mosque's timetable"
  );
  await expect(sheet.locator('[data-sheet-footer]')).toContainText('follow your local masjid');
  await expect(sheet.locator('table')).toHaveAttribute('data-timezone', 'Europe/London');

  await page.emulateMedia({ media: 'print' });
  // On paper the sheet is all there is.
  await expect(page.getByTestId('ramadan-sheet-card')).toBeHidden();
  await expect(sheet.locator('[data-print-head]')).toBeVisible();
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  expect(pdfPages(pdf)).toBe(1);
});

test('a guest gets the same sheet', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-17T10:00:00+06:00'));
  await page.goto('/ramadan');
  const sheet = await printSheet(page);
  await expect(sheet.locator('tbody tr[data-date]').first()).toHaveAttribute(
    'data-date',
    '2027-02-08'
  );
});

test('a static Ramadan page links a town without a page to the app', async ({ page }) => {
  // vite preview serves the app shell for a bare prerendered path.
  await page.goto('/ramadan-calendar/london-united-kingdom/2027/index.html');
  const link = page.getByRole('link', { name: 'Not your town? Use your location in the app' });
  await expect(link).toHaveAttribute('href', '/ramadan');
});
