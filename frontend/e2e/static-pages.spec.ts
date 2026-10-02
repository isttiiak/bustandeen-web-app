import { expect, test, type Page } from '@playwright/test';

// Audit PERF-01: the prerendered landing and SEO pages load a tiny static
// entry, never the app (main-*.js, Firebase, framer-motion). Signed-in
// visitors of `/` still get the app at once.

test.beforeEach(async ({ context }) => {
  await context.route(
    (url) => url.hostname !== 'localhost',
    (route) => route.abort()
  );
});

/** Every script the page requests, by file name. */
function scripts(page: Page): string[] {
  const seen: string[] = [];
  page.on('request', (r) => {
    if (r.resourceType() === 'script') seen.push(new URL(r.url()).pathname);
  });
  return seen;
}
const appChunks = (seen: string[]) =>
  seen.filter((s) => /\/assets\/(main|firebase|motion)-/.test(s));

test('a signed-out visitor of / gets the static landing, without the app', async ({ page }) => {
  const seen = scripts(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: /Explore as Brother/ })).toHaveAttribute(
    'href',
    '/demo/brother'
  );
  await page.waitForLoadState('networkidle');
  expect(seen.some((s) => s.includes('/assets/static-'))).toBe(true);
  expect(appChunks(seen)).toEqual([]);
});

test('the Bangla landing, and the language links remember the choice', async ({ page }) => {
  // Vercel serves /bn from dist/bn/index.html; `vite preview` only does that
  // for /bn/, so answer the clean URL the way Vercel does.
  await page.route(/\/bn$/, (route) =>
    route.fulfill({ path: 'dist/bn/index.html', contentType: 'text/html' })
  );
  await page.goto('/');
  await page.getByRole('link', { name: 'বাংলা' }).click();
  await expect(page).toHaveURL(/\/bn\/?$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
  expect(await page.evaluate(() => localStorage.getItem('bustandeen_lang'))).toBe('bn');

  // Coming back to / later sends a Bangla visitor straight to /bn.
  await page.goto('/');
  await expect(page).toHaveURL(/\/bn\/?$/);

  await page.getByRole('link', { name: 'English' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  expect(await page.evaluate(() => localStorage.getItem('bustandeen_lang'))).toBe('en');
});

test('a signed-in visitor of / gets the app', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('bustandeen_idToken', 'e2e-placeholder'));
  const seen = scripts(page);
  await page.goto('/');
  await expect.poll(() => seen.some((s) => /\/assets\/main-/.test(s))).toBe(true);
  await expect(page.locator('[data-prerendered-landing]')).toBeHidden();
});

test('a static SEO page loads no React at all', async ({ page }) => {
  const seen = scripts(page);
  // `vite preview` maps only the trailing-slash form to the folder's page.
  await page.goto('/duas/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(seen.filter((s) => /react-vendor|router-/.test(s))).toEqual([]);
  expect(appChunks(seen)).toEqual([]);
});

test('an interactive SEO page works without the app', async ({ page }) => {
  const seen = scripts(page);
  await page.goto('/hijri-date-converter/');
  const date = page.locator('input[type="date"]');
  await date.fill('2027-02-28');
  await expect(page.getByText(/1448/).first()).toBeVisible();
  await date.fill('2025-03-01');
  await expect(page.getByText(/1446/).first()).toBeVisible();
  expect(appChunks(seen)).toEqual([]);
});
