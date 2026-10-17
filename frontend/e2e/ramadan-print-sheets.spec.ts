import { expect, test, type Page } from '@playwright/test';

// R2-R4: every prerendered Ramadan calendar carries three A4 sheets
// (timetable, timetable + checklist, Ramadan checklist) in colour or black
// and white. The download buttons pick one; plain Ctrl+P prints the timetable
// in colour. Pages are opened by their index.html (`vite preview` answers the
// clean URL with the app shell). window.print is stubbed.

// A4 width (210 mm at 96 dpi), so the overflow check measures the paper layout.
test.use({ viewport: { width: 794, height: 1123 } });

test.beforeEach(async ({ context }) => {
  await context.route(
    (url) => url.hostname !== 'localhost',
    (route) => route.abort()
  );
  await context.addInitScript(() => {
    (window as unknown as { __prints: number }).__prints = 0;
    window.print = () => {
      (window as unknown as { __prints: number }).__prints++;
    };
  });
});

const pdfPages = (pdf: Buffer) =>
  (pdf.toString('latin1').match(/\/Type\s*\/Page(?!s)/g) ?? []).length;

const PAGES = [
  {
    name: 'London (English)',
    path: '/ramadan-calendar/london-united-kingdom/2027/index.html',
    buttons: ['Timetable', 'Timetable + checklist', 'Ramadan checklist'],
    bw: 'Black and white',
  },
  {
    name: 'Dhaka district (Bangla)',
    path: '/bn/ramadan-calendar/dhaka-bangladesh/2027/index.html',
    buttons: ['সময়সূচি', 'সময়সূচি + চেকলিস্ট', 'রমজান চেকলিস্ট'],
    bw: 'সাদা-কালো',
  },
] as const;
const VARIANTS = ['timetable', 'combined', 'checklist'] as const;

const shownSheets = (page: Page) =>
  page
    .locator('[data-ramadan-sheet]')
    .evaluateAll((els) =>
      els.filter((e) => e.checkVisibility()).map((e) => (e as HTMLElement).dataset.ramadanSheet)
    );

for (const p of PAGES) {
  test(`${p.name}: each sheet, both inks, one A4 page; nothing else on paper`, async ({ page }) => {
    await page.goto(p.path);
    const panel = page.locator('[data-sheet-downloads]');
    await expect(panel).toBeVisible();
    // The sheets never show on screen.
    expect(await shownSheets(page)).toEqual([]);

    // Plain Ctrl+P: the timetable, in colour.
    await page.emulateMedia({ media: 'print' });
    expect(await shownSheets(page)).toEqual(['timetable']);
    await page.emulateMedia({ media: 'screen' });

    for (const ink of ['color', 'bw'] as const) {
      if (ink === 'bw') await panel.getByRole('button', { name: p.bw }).click();
      for (const [i, v] of VARIANTS.entries()) {
        await panel.locator(`[data-sheet-print="${v}"]`).click();
        await expect(panel.locator(`[data-sheet-print="${v}"]`)).toContainText(p.buttons[i]);
        expect(await page.evaluate(() => ({ ...document.documentElement.dataset }))).toMatchObject({
          printVariant: v,
          printInk: ink,
        });
        await page.emulateMedia({ media: 'print' });
        expect(await shownSheets(page)).toEqual([v]);
        // Only the sheet is on paper: the panel, table and notes are hidden.
        await expect(panel).toBeHidden();
        await expect(page.locator('[data-ramadan-about]')).toBeHidden();
        const sheet = page.locator(`[data-ramadan-sheet="${v}"]`);
        expect(await sheet.evaluate((e) => e.scrollHeight - e.clientHeight)).toBe(0);
        const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
        expect(pdfPages(pdf)).toBe(1);
        await page.emulateMedia({ media: 'screen' });
      }
    }
  });
}

test('the ink choice is kept on this device', async ({ page }) => {
  await page.goto(PAGES[0].path);
  const panel = page.locator('[data-sheet-downloads]');
  await panel.getByRole('button', { name: 'Black and white' }).click();
  await page.reload();
  await expect(panel.getByRole('button', { name: 'Black and white' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  await expect(panel.getByRole('button', { name: 'Colour' })).toHaveAttribute(
    'aria-pressed',
    'false'
  );
});

test('the live page explains what the paper leaves out', async ({ page }) => {
  await page.goto(PAGES[0].path);
  const about = page.locator('[data-ramadan-about]');
  await expect(about.getByText('Where the dates come from')).toBeVisible();
  await expect(about).toContainText('Umm al-Qura');
  await about.getByText('The 30th fast').click();
  await expect(about).toContainText('Bukhari 1909');
  const tiles = page.locator('[data-fasting-length]');
  await expect(tiles).toContainText('Shortest fast');
  await expect(tiles).toContainText('Longest fast');
  // Stars on the fasts after the odd nights, on screen too.
  await expect(page.locator('table[data-ramadan-table] tr[data-odd]').first()).toHaveAttribute(
    'data-fast',
    '21'
  );
});
