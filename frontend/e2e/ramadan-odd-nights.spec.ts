import { expect, test, type Page } from '@playwright/test';

// R10: a Ramadan night comes before its day. The 21st night begins at
// Maghrib on the evening of the 20th fast (Bukhārī 2017: seek it in the odd
// nights of the last ten). In the demo (Umm al-Qura, Dhaka), 1 Ramaḍān 1448
// is 8 Feb 2027, so the 20th fast is 27 Feb and the 21st is 28 Feb.

test.beforeEach(async ({ context }) => {
  await context.route(
    (url) => url.hostname !== 'localhost',
    (route) => route.abort()
  );
  await context.addInitScript(() =>
    localStorage.setItem(
      'bustandeen_location',
      JSON.stringify({ latitude: 23.81, longitude: 90.41, name: 'Dhaka' })
    )
  );
});

async function ramadanAt(page: Page, at: string) {
  await page.clock.setFixedTime(new Date(at));
  await page.goto('/demo/brother');
  await expect(page.getByText('Demo Mode')).toBeVisible();
  await page.evaluate(() => {
    window.history.pushState({}, '', '/ramadan');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page.getByRole('heading', { name: 'Your month' })).toBeVisible();
}

test('the afternoon of the 20th fast: the last ten have not begun', async ({ page }) => {
  await ramadanAt(page, '2027-02-27T14:00:00+06:00');
  await expect(page.getByRole('heading', { name: 'The last ten nights' })).toHaveCount(0);
  await expect(page.getByText('Night 20 of Ramadan', { exact: true })).toBeVisible();
});

test('after iftar of the 20th fast: the 21st night, an odd night, has begun', async ({ page }) => {
  await ramadanAt(page, '2027-02-27T19:30:00+06:00');
  await expect(page.getByRole('heading', { name: 'The last ten nights' })).toBeVisible();
  await expect(page.getByTestId('tonight-odd-night')).toHaveText(
    'Tonight is night 21 of Ramadan, an odd night of the last ten.'
  );
  await expect(page.getByText('the 21st night begins at iftar of the 20th fast')).toBeVisible();
  // Tarawih tonight is the 21st night's, saved on the 21st fast.
  await expect(page.getByText('Night 21 of Ramadan', { exact: true })).toBeVisible();
});

test('the day of the 21st fast: its night was last night, no "tonight" line', async ({ page }) => {
  await ramadanAt(page, '2027-02-28T14:00:00+06:00');
  await expect(page.getByRole('heading', { name: 'The last ten nights' })).toBeVisible();
  await expect(page.getByTestId('tonight-odd-night')).toHaveCount(0);
  await expect(page.getByText('Night 21 of Ramadan', { exact: true })).toBeVisible();
});
