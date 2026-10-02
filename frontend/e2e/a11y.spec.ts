import { expect, test, type Page } from '@playwright/test';

// Audit A11Y-01: white text on the sage brand colour (#7a9e6e) is 3.02:1,
// below WCAG AA's 4.5:1, so buttons use brand-emerald-dim (#5a7a50, 4.84:1).
// This walks the demo app and fails if any visible element paints white text
// on solid sage again. It also checks the Home heading order and that the
// navbar's icon-only back button has a name.

const ROUTES = [
  '/',
  '/zikr',
  '/zikr/analytics',
  '/salat',
  '/salat/analytics',
  '/fasting',
  '/fasting/analytics',
  '/quran',
  '/quran/hifz',
  '/settings',
  '/friends',
  '/sadaqah',
];

// These checks are written against the dark palette; Playwright reports a
// light OS by default, which now selects the light theme (T3.2).
test.use({ colorScheme: 'dark' });

test.beforeEach(async ({ context }) => {
  await context.route(
    (url) => url.hostname !== 'localhost',
    (route) => route.abort()
  );
});

async function enterDemo(page: Page) {
  await page.goto('/');
  await page.getByRole('link', { name: /Explore as Sister/ }).click();
  await expect(page.getByText('Demo Mode')).toBeVisible();
}

async function go(page: Page, path: string) {
  await page.evaluate((p) => {
    window.history.pushState({}, '', p);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);
  await page.waitForTimeout(700);
}

test('no white text on the sage brand colour', async ({ page }) => {
  test.setTimeout(120_000);
  await enterDemo(page);
  const offenders: string[] = [];
  for (const path of ROUTES) {
    await go(page, path);
    const found = await page.evaluate(() => {
      const SAGE = 'rgb(122, 158, 110)';
      const out: string[] = [];
      for (const el of document.querySelectorAll<HTMLElement>('body *')) {
        const cs = getComputedStyle(el);
        const sageBg =
          cs.backgroundColor === SAGE || cs.backgroundImage.includes('rgb(122, 158, 110)');
        if (!sageBg || cs.color !== 'rgb(255, 255, 255)') continue;
        if (!el.innerText?.trim() || el.getClientRects().length === 0) continue;
        out.push(el.outerHTML.slice(0, 120));
      }
      return out;
    });
    offenders.push(...found.map((h) => `${path}: ${h}`));
  }
  expect(offenders).toEqual([]);
});

test('Home headings do not skip a level', async ({ page }) => {
  await enterDemo(page);
  await go(page, '/');
  const levels = await page.evaluate(() =>
    [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((h) => Number(h.tagName[1]))
  );
  for (let i = 1; i < levels.length; i++) {
    expect(levels[i] - levels[i - 1], `heading levels ${levels.join(',')}`).toBeLessThanOrEqual(1);
  }
});

test('the navbar back button has a name', async ({ page }) => {
  await enterDemo(page);
  await go(page, '/zikr');
  await expect(page.getByRole('button', { name: /^Back: / })).toBeVisible();
});

test('a sage button keeps its colour on hover', async ({ page }) => {
  // DaisyUI's `.btn:hover` paints the base-300 grey over a plain `bg-*` class;
  // `hover:bg-brand-emerald-dim` has to win, or white text sits on grey.
  await enterDemo(page);
  await go(page, '/salat/analytics');
  const button = page.getByRole('button', { name: 'Create Free Account' }).first();
  await button.hover();
  await expect(button).toHaveCSS('background-color', 'rgb(90, 122, 80)');
});
