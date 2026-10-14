import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// bayan.bustandeen.com, Help & Updates (v5.164.0). `vite preview` answers
// bayan.localhost the way vercel.json answers the real host (vite.config.ts).

test.use({ colorScheme: 'dark' });

const base = () =>
  (test.info().project.use.baseURL ?? 'http://localhost:4173').replace(
    '//localhost',
    '//bayan.localhost'
  );

test.beforeEach(async ({ context }) => {
  await context.route(
    (url) => !url.hostname.endsWith('localhost'),
    (route) => route.abort()
  );
});

async function smallTargets(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>('a[href], button, summary, input')) {
      const r = el.getBoundingClientRect();
      if (!r.width || (el.tagName === 'A' && getComputedStyle(el).display === 'inline')) continue;
      if (r.width >= 43.5 && r.height >= 43.5) continue;
      out.push(`${Math.round(r.width)}x${Math.round(r.height)} ${el.outerHTML.slice(0, 80)}`);
    }
    return out;
  });
}

async function axe(page: Page) {
  const res = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return res.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' ')}`);
}

test('home: / opens /home, guides filter, no app scripts', async ({ page }) => {
  const scripts: string[] = [];
  page.on('request', (r) => {
    if (r.resourceType() === 'script') scripts.push(new URL(r.url()).pathname);
  });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${base()}/`);
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Help & updates' })).toBeVisible();
  await expect(page.locator('[data-bayan-guide]')).toHaveCount(8);

  await page.getByRole('searchbox').fill('fast');
  await expect(page.locator('[data-bayan-guide]:visible')).toHaveCount(1);
  await page.getByRole('searchbox').fill('zzzz');
  await expect(page.getByText('No guide matches.')).toBeVisible();
  await page.getByRole('searchbox').fill('');

  expect(scripts).toEqual(['/filter.js']);
  expect(await smallTargets(page)).toEqual([]);
  expect(await axe(page)).toEqual([]);
});

test('a guide in Bangla, the language switch and the app link', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${base()}/bn`);
  await expect(page).toHaveURL(/\/bn\/home$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
  await page.getByRole('link', { name: /নামায ও কাযা/ }).click();
  await expect(page).toHaveURL(/\/bn\/guides\/salat-and-kaza$/);
  await expect(page.getByRole('heading', { level: 1, name: 'নামায ও কাযা' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'নামায খুলুন' })).toHaveAttribute(
    'href',
    'https://bustandeen.com/salat'
  );
  expect(await smallTargets(page)).toEqual([]);
  expect(await axe(page)).toEqual([]);

  await page.getByRole('link', { name: 'English' }).click();
  await expect(page).toHaveURL(/\/guides\/salat-and-kaza$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Salat and kaza' })).toBeVisible();
});

test("What's new, How we calculate and Credits pass axe", async ({ page }) => {
  for (const path of ['/whats-new', '/how-we-calculate', '/credits', '/bn/whats-new']) {
    await page.goto(`${base()}${path}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await axe(page), path).toEqual([]);
  }
});
