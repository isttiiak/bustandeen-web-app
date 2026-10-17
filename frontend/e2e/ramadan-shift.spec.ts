import { expect, test, type Page } from '@playwright/test';

// R12: a visitor whose masjid began Ramadan a day apart moves the
// prerendered calendar by one day. Times stay with their date; the fast
// numbers, the "if Ramadan has 30 days" row and the sheet's note move. The
// pages are opened by their index.html: `vite preview` answers the clean URL
// with the app shell. Dates are read from the page (the build applies the
// moon-sighting records it fetched), never hard-coded.

test.beforeEach(async ({ context }) => {
  await context.route(
    (url) => url.hostname !== 'localhost',
    (route) => route.abort()
  );
});

const PAGES = [
  {
    name: 'a world city (English)',
    path: '/ramadan-calendar/london-united-kingdom/2027/',
    earlier: 'One day earlier',
    later: 'One day later',
    shown: 'As shown',
    note: 'Adjusted on this device for your area',
    one: '1',
    two: '2',
  },
  {
    name: 'a Bangladesh district (English)',
    path: '/ramadan-calendar/dhaka-bangladesh/2027/',
    earlier: 'One day earlier',
    later: 'One day later',
    shown: 'As shown',
    note: 'Adjusted on this device for your area',
    one: '1',
    two: '2',
  },
  {
    name: 'a Bangladesh district (Bangla)',
    path: '/bn/ramadan-calendar/dhaka-bangladesh/2027/',
    earlier: 'এক দিন আগে',
    later: 'এক দিন পরে',
    shown: 'যেমন দেখানো আছে',
    note: 'আপনার এলাকার জন্য এই ডিভাইসে বদলানো হয়েছে',
    one: '১',
    two: '২',
  },
] as const;

const rows = (page: Page) => page.locator('tr[data-ramadan-row]:visible');
/** The visible rows as [fast number, date]. */
const table = (page: Page) =>
  rows(page).evaluateAll((trs) =>
    trs.map((tr) => [
      tr.querySelector('[data-fast-num]')?.textContent ?? '',
      (tr as HTMLElement).dataset.date ?? '',
    ])
  );
/** Times of a date's row: they never move with the shift. */
const timesOf = (page: Page, date: string) =>
  page.locator(`tr[data-date="${date}"] td:nth-last-child(-n+2)`).allTextContents();

/** Pages in a PDF (each page object has /Type /Page). */
const pdfPages = (pdf: Buffer) =>
  (pdf.toString('latin1').match(/\/Type\s*\/Page(?!s)/g) ?? []).length;

for (const p of PAGES) {
  test(`${p.name}: shift by one day either way, kept on reload, printed`, async ({ page }) => {
    await page.goto(`${p.path}index.html`);
    const group = page.getByRole('group', { name: /Ramadan|রমজান/ });
    await expect(group).toBeVisible();
    await expect(group.getByRole('button', { name: p.shown })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    const built = await table(page);
    expect(built[0][0]).toBe(p.one);
    const [, first] = built[0];
    const [, second] = built[1];
    const firstTimes = await timesOf(page, first);
    const hasPossible = (await page.locator('tr[data-possible]').count()) > 0;
    // The date of the row under the shown "if Ramadan has 30 days" label.
    const labelAt = () =>
      page.evaluate(() => {
        const label = [...document.querySelectorAll<HTMLElement>('tr[data-possible-label]')].find(
          (tr) => !tr.hidden
        );
        return (label?.nextElementSibling as HTMLElement | null)?.dataset.date ?? null;
      });
    const builtLabel = hasPossible ? await labelAt() : null;
    await expect(page.locator('[data-shift-note]:visible')).toHaveCount(0);

    // One day later: the built fast 1 is no fast, its second day is fast 1.
    await group.getByRole('button', { name: p.later }).click();
    const later = await table(page);
    expect(later[0]).toEqual([p.one, second]);
    expect(later).toHaveLength(built.length);
    expect(await page.locator(`tr[data-date="${first}"]`).first().isHidden()).toBe(true);
    await expect(page.locator('[data-shift-note]:visible')).toContainText(p.note);
    if (hasPossible) {
      expect(builtLabel).not.toBeNull();
      expect(await labelAt()).not.toBe(builtLabel);
    }

    // Reload: the shift is remembered for this page.
    await page.reload();
    expect((await table(page))[0]).toEqual([p.one, second]);
    await expect(group.getByRole('button', { name: p.later })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    // One day earlier: the day before is fast 1 and the built fast 1 is 2,
    // with its own times unchanged.
    await group.getByRole('button', { name: p.earlier }).click();
    const earlier = await table(page);
    expect(earlier).toHaveLength(built.length);
    expect(earlier[1]).toEqual([p.two, first]);
    expect(await timesOf(page, first)).toEqual(firstTimes);

    // Paper (the timetable sheet, R2-R4): the shifted numbering, and the
    // odd-night stars moved with it (one row earlier), still one A4 page.
    await page.emulateMedia({ media: 'print' });
    expect((await table(page))[1]).toEqual([p.two, first]);
    await expect(group).toBeHidden();
    const starredRows = await page
      .locator('[data-ramadan-sheet="timetable"] tr[data-odd]')
      .evaluateAll((trs) => trs.map((tr) => Number((tr as HTMLElement).dataset.fast)));
    expect(starredRows).toEqual([21, 23, 25, 27, 29]);
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
    expect(pdfPages(pdf)).toBe(1);
    await page.emulateMedia({ media: 'screen' });

    // As shown: back to the build, nothing saved.
    await group.getByRole('button', { name: p.shown }).click();
    expect(await table(page)).toEqual(built);
    await page.reload();
    expect(await table(page)).toEqual(built);
  });
}

test('the page still loads only the static entry, never the app', async ({ page }) => {
  const seen: string[] = [];
  page.on('request', (r) => {
    if (r.resourceType() === 'script') seen.push(new URL(r.url()).pathname);
  });
  await page.goto('/ramadan-calendar/london-united-kingdom/2027/index.html');
  await page.getByRole('button', { name: 'One day later' }).click();
  await page.waitForLoadState('networkidle');
  expect(seen.filter((s) => /\/assets\/(main|firebase|motion)-/.test(s))).toEqual([]);
});
