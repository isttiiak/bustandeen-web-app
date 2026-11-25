import { expect, test, type Page } from '@playwright/test';

// Audit 2026-11-16 P4-2: one page that throws shows a message in its place; the
// navigation and the rest of the app keep working, and going elsewhere loads
// the next page. The Salat page's code is replaced with a module that throws.

test.beforeEach(async ({ context }) => {
  await context.route(
    (url) => url.hostname !== 'localhost',
    (route) => route.abort()
  );
  await context.route('**/assets/SalatTracker-*.js', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/javascript',
      body: "throw new Error('route crash test');",
    })
  );
});

async function go(page: Page, path: string) {
  await page.evaluate((p) => {
    window.history.pushState({}, '', p);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);
}

test('a crashing page shows a message, keeps the navbar, and the next page loads', async ({
  page,
}) => {
  await page.goto('/demo/sister');
  await expect(page.getByText('Demo Mode')).toBeVisible();

  await go(page, '/salat');
  const alert = page.getByRole('alert').filter({ hasText: 'This page ran into a problem' });
  await expect(alert).toBeVisible();
  await expect(alert.getByRole('button', { name: 'Try again' })).toBeVisible();
  // The shell around the page is still there.
  await expect(page.getByText('Demo Mode')).toBeVisible();
  await expect(page.locator('nav').first()).toBeVisible();

  // Leaving the page clears the error and the next page renders.
  await go(page, '/zikr');
  await expect(page.getByTestId('zikr-count')).toBeVisible();
  await expect(alert).toHaveCount(0);
});
