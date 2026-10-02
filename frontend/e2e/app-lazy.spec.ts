import { expect, test, type Page } from '@playwright/test';

// PERF-01 follow-up: on app pages a visitor who has never signed in does not
// download Firebase, and the animation features arrive after the app starts.
// Anyone with a session on this device still gets Firebase at once.

test.beforeEach(async ({ context }) => {
  await context.route(
    (url) => url.hostname !== 'localhost',
    (route) => route.abort()
  );
});

function scripts(page: Page): string[] {
  const seen: string[] = [];
  page.on('request', (r) => {
    if (r.resourceType() === 'script') seen.push(new URL(r.url()).pathname);
  });
  return seen;
}
const firebase = (seen: string[]) => seen.some((s) => /\/assets\/firebase-/.test(s));

test('a guest on /zikr counts without downloading Firebase', async ({ page }) => {
  const seen = scripts(page);
  await page.goto('/zikr');
  const count = page.getByTestId('zikr-count');
  await expect(count).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(seen.some((s) => /\/assets\/motionFeatures-/.test(s))).toBe(true);
  expect(firebase(seen)).toBe(false);
});

test('someone with a session on this device gets Firebase at once', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('bustandeen_has_session', '1'));
  const seen = scripts(page);
  await page.goto('/zikr');
  await expect.poll(() => firebase(seen)).toBe(true);
});

test('the sign-in page loads Firebase', async ({ page }) => {
  const seen = scripts(page);
  await page.goto('/login');
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect.poll(() => firebase(seen)).toBe(true);
});
