import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

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
  '/welcome',
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
  // The guest "Sign in required" screen (the demo's analytics gate is gone, U9).
  await page.goto('/settings');
  const button = page.getByRole('button', { name: 'Sign In' }).first();
  await button.hover();
  await expect(button).toHaveCSS('background-color', 'rgb(90, 122, 80)');
});

// ── T3.5 (UX-04) ────────────────────────────────────────────────────────────

const AXE_ROUTES = [
  ...ROUTES,
  '/quran/browse',
  '/prayer-times',
  '/qibla',
  '/ramadan',
  '/profile',
  '/naseeh',
  '/about',
  '/privacy',
];

async function axeViolations(page: Page, include?: string): Promise<string[]> {
  let builder = new AxeBuilder({ page }).withTags([
    'wcag2a',
    'wcag2aa',
    'wcag21a',
    'wcag21aa',
    'best-practice',
  ]);
  if (include) builder = builder.include(include);
  const res = await builder.analyze();
  return res.violations.flatMap((v) =>
    v.nodes.map((n) => `${v.id}: ${n.target.join(' ')} ${n.html.slice(0, 100)}`)
  );
}

for (const scheme of ['dark', 'light'] as const) {
  test(`axe finds nothing on the demo routes (${scheme})`, async ({ page }) => {
    test.setTimeout(240_000);
    await page.emulateMedia({ colorScheme: scheme });
    await page.setViewportSize({ width: 375, height: 812 });
    await enterDemo(page);
    const found: string[] = [];
    for (const path of AXE_ROUTES) {
      await go(page, path);
      found.push(...(await axeViolations(page)).map((v) => `${path} ${v}`));
    }
    expect(found).toEqual([]);
  });
}

/** Every control is at least 44x44: its own box, its `hit-44` area, or the
 * <label> row it sits in. Inline text links are exempt (WCAG 2.5.5). */
async function smallTargets(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const big = (w: number, h: number) => w >= 43.5 && h >= 43.5;
    const out: string[] = [];
    const sel =
      'a[href], button, [role=button], [role=tab], [role=radio], [role=switch], input:not([type=hidden]), select, summary';
    for (const el of document.querySelectorAll<HTMLElement>(sel)) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || getComputedStyle(el).visibility === 'hidden') continue;
      if (el.closest('[aria-hidden="true"], .sr-only')) continue;
      if (el.tagName === 'A' && getComputedStyle(el).display === 'inline') continue;
      if (big(r.width, r.height)) continue;
      const after = getComputedStyle(el, '::after');
      if (after.content !== 'none' && big(parseFloat(after.width), parseFloat(after.height)))
        continue;
      const label = el.closest('label');
      if (label) {
        const lr = label.getBoundingClientRect();
        if (big(lr.width, lr.height)) continue;
      }
      out.push(`${Math.round(r.width)}x${Math.round(r.height)} ${el.outerHTML.slice(0, 110)}`);
    }
    return out;
  });
}

test('every tap target is at least 44px at 375px', async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 375, height: 812 });
  await enterDemo(page);
  const found: string[] = [];
  for (const path of AXE_ROUTES) {
    await go(page, path);
    found.push(...(await smallTargets(page)).map((s) => `${path} ${s}`));
  }
  expect(found).toEqual([]);
});

test('Arabic text is marked lang="ar"', async ({ page }) => {
  test.setTimeout(120_000);
  await enterDemo(page);
  const found: string[] = [];
  for (const path of AXE_ROUTES) {
    await go(page, path);
    const bad = await page.evaluate(() => {
      const out: string[] = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!/[؀-ۿ]/.test(n.textContent ?? '')) continue;
        const host = n.parentElement;
        if (!host || host.closest('[lang^="ar"]')) continue;
        out.push(host.outerHTML.slice(0, 100));
      }
      return out;
    });
    found.push(...bad.map((b) => `${path} ${b}`));
  }
  expect(found).toEqual([]);
});

test('Home quick sections pass axe and 44px in both themes', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 375, height: 812 });
  await enterDemo(page);
  for (const scheme of ['dark', 'light'] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await go(page, '/');
    const sections = page.locator('[data-home-section]');
    expect(await sections.count()).toBeGreaterThanOrEqual(3);
    expect(await axeViolations(page, '[data-home-section]')).toEqual([]);
  }
  expect(await smallTargets(page)).toEqual([]);
});

test('reduced motion follows the device, and Settings can turn it off', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await enterDemo(page);
  await expect(page.locator('html')).toHaveAttribute('data-reduce-motion', '');
  await go(page, '/settings');
  await page.getByRole('radio', { name: 'Off' }).click();
  await expect(page.locator('html')).not.toHaveAttribute('data-reduce-motion', '');
  await page.getByRole('radio', { name: 'Auto' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-reduce-motion', '');
});

test('the zikr counter announces every tap', async ({ page }) => {
  await enterDemo(page);
  await go(page, '/zikr');
  const live = page.locator('[aria-live="polite"][aria-atomic="true"]').first();
  const before = Number(
    ((await page.getByTestId('zikr-count').textContent()) ?? '0').replace(/\D/g, '')
  );
  await page.getByRole('button', { name: 'Count', exact: true }).click();
  await expect(live).toHaveText(String(before + 1));
  await page.getByRole('button', { name: 'Count', exact: true }).click();
  await expect(live).toHaveText(String(before + 2));
});

test('the skip link moves focus to the main content', async ({ page }) => {
  await enterDemo(page);
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to main content' });
  await expect(skip).toBeFocused();
  await skip.press('Enter');
  await expect(page.locator('main#main')).toBeFocused();
});
