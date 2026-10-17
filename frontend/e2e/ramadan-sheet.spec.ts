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

/** Click one of the card's three sheets; the print window (stubbed) opens. */
async function printSheet(page: Page, variant = 'timetable', prints = 1) {
  const card = page.getByTestId('ramadan-sheet-card');
  await card.locator(`[data-sheet-print="${variant}"]`).click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __prints: number }).__prints))
    .toBe(prints);
  const root = page.getByTestId('ramadan-print');
  await expect(root).toHaveCount(1);
  return root;
}

async function openRamadan(page: Page) {
  await page.clock.setFixedTime(new Date('2026-10-17T10:00:00+06:00'));
  await page.goto('/demo/brother');
  await expect(page.getByText('Demo Mode')).toBeVisible();
  await page.evaluate(() => {
    window.history.pushState({}, '', '/ramadan');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
}

test('demo user in a town without a page: one A4 page, the right first row', async ({ page }) => {
  await openRamadan(page);
  const root = await printSheet(page);
  const sheet = root.locator('[data-ramadan-sheet="timetable"]');

  await expect(sheet).toContainText('Ramadan 2027 Suhoor & Iftar');
  await expect(sheet).toContainText('Keighley, United Kingdom (53.87° N, 1.91° W)');
  const first = sheet.locator('tbody tr[data-date]').first();
  await expect(first).toHaveAttribute('data-date', '2027-02-08');
  await expect(first.locator('[data-fast-num]')).toHaveText('1');
  await expect(first.locator('td').nth(2)).toHaveText('06:04 AM');
  await expect(first.locator('td').nth(3)).toHaveText('05:06 PM');
  // 29 fasts by Umm al-Qura, and the possible 30th; stars on 21-29 odd.
  await expect(sheet.locator('tbody tr[data-date]')).toHaveCount(30);
  await expect(sheet).toContainText('If Ramadan has 30 days');
  await expect(sheet.locator('tr[data-odd]')).toHaveCount(5);
  // The two blocks Istiak chose, and the page address as the footer.
  await expect(sheet.locator('[data-sheet-block]')).toHaveCount(2);
  await expect(sheet.locator('.rs-foot')).toHaveText('bustandeen.com/ramadan');

  await page.emulateMedia({ media: 'print' });
  // On paper the timetable is all there is.
  await expect(page.getByTestId('ramadan-sheet-card')).toBeHidden();
  await expect(sheet).toBeVisible();
  await expect(root.locator('[data-ramadan-sheet="combined"]')).toBeHidden();
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  expect(pdfPages(pdf)).toBe(1);
});

test('the checklist in black and white: the chosen sheet and ink go to paper', async ({ page }) => {
  await openRamadan(page);
  const card = page.getByTestId('ramadan-sheet-card');
  await card.getByRole('button', { name: 'Black and white' }).click();
  await expect(card.getByRole('button', { name: 'Black and white' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  const root = await printSheet(page, 'checklist');
  expect(await page.evaluate(() => ({ ...document.documentElement.dataset }))).toMatchObject({
    printVariant: 'checklist',
    printInk: 'bw',
  });
  await page.emulateMedia({ media: 'print' });
  await expect(root.locator('[data-ramadan-sheet="checklist"]')).toBeVisible();
  await expect(root.locator('[data-ramadan-sheet="timetable"]')).toBeHidden();
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  expect(pdfPages(pdf)).toBe(1);
});

test('a guest gets the same sheet', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-17T10:00:00+06:00'));
  await page.goto('/ramadan');
  const root = await printSheet(page);
  await expect(
    root.locator('[data-ramadan-sheet="timetable"] tbody tr[data-date]').first()
  ).toHaveAttribute('data-date', '2027-02-08');
});

test('a static Ramadan page links a town without a page to the app', async ({ page }) => {
  // vite preview serves the app shell for a bare prerendered path.
  await page.goto('/ramadan-calendar/london-united-kingdom/2027/index.html');
  const link = page.getByRole('link', { name: 'Not your town? Use your location in the app' });
  await expect(link).toHaveAttribute('href', '/ramadan');
});
