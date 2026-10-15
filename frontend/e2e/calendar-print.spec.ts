import { expect, test, type Page } from '@playwright/test';

// The Islamic calendar download (print to PDF): the drawer, the notice, and
// the printed sheets themselves, rendered to a real PDF. window.print is
// stubbed (the test cannot press "Save"), so the sheets stay drawn and
// page.pdf prints them with the injected @page size. Bangladesh record
// fixture as in calendar.spec.ts.

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
  await context.addInitScript(() => {
    (window as unknown as { __prints: number }).__prints = 0;
    window.print = () => {
      (window as unknown as { __prints: number }).__prints++;
    };
  });
});

async function openDownload(page: Page, layers = 'greg,hijri') {
  await page.clock.setFixedTime(new Date('2026-10-15T10:00:00+06:00'));
  await page.addInitScript((l) => localStorage.setItem('bustandeen_calendar_layers', l), layers);
  await page.goto('/demo/brother');
  await expect(page.getByText('Demo Mode')).toBeVisible();
  await page.evaluate(() => {
    window.history.pushState({}, '', '/library/calendar');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await page.getByRole('button', { name: 'Download calendar' }).click();
  await expect(page.getByTestId('calendar-download')).toBeVisible();
}

async function print(page: Page) {
  await page.getByTestId('calendar-download-go').click();
  const notice = page.getByTestId('calendar-notice');
  await expect(notice).toContainText('Hijri dates begin at Maghrib');
  await notice.getByRole('button', { name: 'Open print sheet' }).click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __prints: number }).__prints))
    .toBe(1);
}

/** Pages in a PDF (each page object has /Type /Page). */
const pdfPages = (pdf: Buffer) =>
  (pdf.toString('latin1').match(/\/Type\s*\/Page(?!s)/g) ?? []).length;

async function pdf(page: Page) {
  await page.emulateMedia({ media: 'print' });
  return page.pdf({ preferCSSPageSize: true, printBackground: true });
}

test('Cancel in the notice prints nothing', async ({ page }) => {
  await openDownload(page);
  await page.getByTestId('calendar-download-go').click();
  await page.getByTestId('calendar-notice').getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByTestId('calendar-notice')).toHaveCount(0);
  await expect(page.getByTestId('calendar-download')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __prints: number }).__prints)).toBe(0);
});

test('this month: one A4 landscape page, the Corners layout, nothing overflows', async ({
  page,
}) => {
  await openDownload(page, 'greg,hijri,bn');
  await print(page);
  const sheets = page.locator('#pc-print-root [data-print-sheet]');
  await expect(sheets).toHaveCount(1);
  await expect(sheets.first()).toContainText('October 2026');
  await expect(sheets.first()).toContainText('Made with Bustandeen');
  await expect(sheets.first()).toContainText('bustandeen.com/calendar');
  // 13 Oct: 1 Jumādā al-Ūlā top right, its Bengali date under the big number (Bangla digits)
  const oct13 = page.locator('[data-print-day="2026-10-13"]');
  await expect(oct13.locator('.pc-n2')).toContainText('1 Jumādā al-Ūlā');
  await expect(oct13.locator('.pc-n3')).toHaveText('২৮');
  // Holidays in the box and the side column
  await expect(page.locator('[data-print-day="2026-10-21"] .pc-ev')).toHaveText('Bijoya Dashami');
  await expect(sheets.first().locator('.pc-side')).toContainText('Durga Puja (Bijoya Dashami)');

  const layout = await page.evaluate(() => {
    const boxes = [...document.querySelectorAll<HTMLElement>('#pc-print-root .pc-c')];
    const overflow = boxes.filter((b) => b.scrollHeight > b.clientHeight + 1).length;
    const overlaps = boxes.filter((b) => {
      const a = b.querySelector('.pc-n1')?.getBoundingClientRect();
      const c = (
        b.querySelector('.pc-n2 .pc-mk') ?? b.querySelector('.pc-n2')
      )?.getBoundingClientRect();
      return a && c && a.right > c.left + 0.5 && a.bottom > c.top;
    }).length;
    return { overflow, overlaps };
  });
  expect(layout).toEqual({ overflow: 0, overlaps: 0 });

  const file = await pdf(page);
  expect(pdfPages(file)).toBe(1);
});

test('a full year: twelve pages; at a glance: one', async ({ page }) => {
  await openDownload(page);
  await page.getByRole('radio', { name: /Full year/ }).click();
  await print(page);
  await expect(page.locator('#pc-print-root [data-print-sheet]')).toHaveCount(12);
  expect(pdfPages(await pdf(page))).toBe(12);
});

test('year at a glance and black and white', async ({ page }) => {
  await openDownload(page);
  await page.getByRole('radio', { name: /Full year/ }).click();
  await page.getByRole('radio', { name: /1 page/ }).click();
  await page.getByRole('button', { name: 'Black and white' }).click();
  await print(page);
  const sheet = page.locator('#pc-print-root [data-print-sheet]');
  await expect(sheet).toHaveCount(1);
  await expect(sheet).toHaveClass(/pc-mono/);
  await expect(sheet).toContainText('Year at a glance');
  expect(pdfPages(await pdf(page))).toBe(1);
});

test('portrait Letter, blank days, Hijri first', async ({ page }) => {
  await openDownload(page);
  await page.getByRole('button', { name: 'Move Hijri up' }).click();
  await page.getByRole('button', { name: 'Letter' }).click();
  await page.getByRole('button', { name: 'Portrait' }).click();
  await page.getByRole('button', { name: 'Blank for writing' }).click();
  await print(page);
  const sheet = page.locator('#pc-print-root [data-print-sheet]');
  await expect(sheet).toContainText('Jumādā al-Ūlā 1448 AH');
  // Blank for writing: empty day boxes, writing lines under the guide.
  // (The print root is hidden on screen, so count rather than look.)
  await expect(sheet.locator('.pc-evs')).toHaveCount(0);
  await expect(sheet.locator('[data-print-notes]')).toHaveCount(1);
  expect(pdfPages(await pdf(page))).toBe(1);
});

test('blank for writing, landscape: the lines fill the side column', async ({ page }) => {
  await openDownload(page);
  await page.getByRole('button', { name: 'Blank for writing' }).click();
  await print(page);
  await page.emulateMedia({ media: 'print' });
  const box = await page.evaluate(() => {
    const side = document.querySelector('#pc-print-root .pc-side')!.getBoundingClientRect();
    const notes = document
      .querySelector('#pc-print-root [data-print-notes]')!
      .getBoundingClientRect();
    const cell = document.querySelector('#pc-print-root [data-print-day="2026-10-21"]')!;
    return {
      reachesBottom: Math.abs(side.bottom - notes.bottom) < 2,
      tall: notes.height > 150,
      emptyBox: cell.querySelectorAll('.pc-ev').length === 0,
    };
  });
  expect(box).toEqual({ reachesBottom: true, tall: true, emptyBox: true });
  expect(pdfPages(await pdf(page))).toBe(1);
});
