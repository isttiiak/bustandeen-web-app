import { expect, test, type Page } from '@playwright/test';

// T3.4 follow-ups (A): the arch carries today's date and the current prayer's
// countdown above its divider; ʿIshāʾ's preferred time runs to Islamic
// midnight (Sahih Muslim 612a), then it counts down to Fajr. The navbar has a
// one-tap Light/Dark switch tied to the Settings theme mode.

test.beforeEach(async ({ context }) => {
  await context.route(
    (url) => url.hostname !== 'localhost',
    (route) => route.abort()
  );
});

async function demoHomeAt(page: Page, at: string) {
  await page.clock.setFixedTime(new Date(at));
  await page.context().addInitScript(() => {
    localStorage.setItem(
      'bustandeen_location',
      JSON.stringify({ latitude: 23.81, longitude: 90.41, name: 'Dhaka' })
    );
  });
  await page.goto('/demo/brother');
  await expect(page.getByText('Demo Mode').first()).toBeVisible();
}

const arch = (page: Page) => page.locator('.rounded-arch').first();

test('ʿIshāʾ before Islamic midnight: "Best time" countdown above the divider', async ({
  page,
}) => {
  await demoHomeAt(page, '2026-10-15T20:00:00+06:00');
  await expect(arch(page)).toContainText(/Best until/);
  await expect(arch(page)).toContainText(/Best time: .*left/);
  // The date moved from the navbar into the arch.
  await expect(arch(page)).toContainText(/Thu, Oct 15/);
  // The countdown sits above the divider; the next prayer below it.
  const divider = arch(page).locator('.border-t');
  await expect(divider).toContainText('Next');
  await expect(divider).not.toContainText(/Best time|Ends in/);
});

test('ʿIshāʾ after Islamic midnight: no "best", it counts down to Fajr', async ({ page }) => {
  await demoHomeAt(page, '2026-10-16T00:30:00+06:00');
  await expect(arch(page)).toContainText(/Ends at Fajr/);
  await expect(arch(page)).toContainText(/Ends in/);
  await expect(arch(page)).not.toContainText(/Best/);
});

test('navbar toggle switches Light/Dark and Settings shows the same mode', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await demoHomeAt(page, '2026-10-15T13:00:00+06:00');
  const theme = () => page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  expect(await theme()).toBe('bustandeen');
  await page.getByRole('button', { name: 'Switch to light' }).click();
  expect(await theme()).toBe('bustandeen-light');
  await page.evaluate(() => {
    window.history.pushState({}, '', '/settings');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  const group = page.getByRole('radiogroup', { name: 'Appearance' });
  await expect(group.getByRole('radio', { name: /^Light/ })).toHaveAttribute(
    'aria-checked',
    'true'
  );
  await page.getByRole('button', { name: 'Switch to dark' }).click();
  expect(await theme()).toBe('bustandeen');
  await expect(group.getByRole('radio', { name: /^Dark/ })).toHaveAttribute('aria-checked', 'true');
});
