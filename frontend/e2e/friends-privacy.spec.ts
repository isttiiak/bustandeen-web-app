import { expect, test, type Page } from '@playwright/test';

// T3.6 (FIQH-03): the friends circle is never ranked, a friend who shares
// consistency only shows no daily numbers, a secret area is simply absent,
// and the framing line carries its verified citation.

test.beforeEach(async ({ context }) => {
  await context.route(
    (url) => url.hostname !== 'localhost',
    (route) => route.abort()
  );
});

async function demoAt(page: Page, path: string) {
  await page.goto('/');
  await page.getByRole('link', { name: /Explore as Brother/ }).click();
  await expect(page.getByText('Demo Mode')).toBeVisible();
  await page.evaluate((p) => {
    window.history.pushState({}, '', p);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);
}

test('the circle: you first, no ranks, consistency-only and secret rows', async ({ page }) => {
  await demoAt(page, '/friends');
  const rows = page.locator('.rounded-card').filter({ has: page.locator('img, svg') });
  const names = page.getByText(/^(Abdullah|Umar|Ibrahim|Yusuf)$/);
  await expect(names).toHaveCount(4);
  // You first, then the longest streak (Umar 30), never by Noor
  await expect(names.first()).toHaveText('Abdullah');
  await expect(names.nth(1)).toHaveText('Umar');

  // No rank discs (the old 1/2/3 badges)
  await expect(page.locator('.tabular-nums.rounded-full.w-7')).toHaveCount(0);

  // Ibrahim shares consistency only: label + streak chips, no Noor, no prayers
  const ibrahim = rows.filter({ hasText: 'Ibrahim' });
  await expect(ibrahim.getByText('Shares consistency only')).toBeVisible();
  await expect(ibrahim.getByText(/Quran \d+ days/)).toBeVisible();
  await expect(ibrahim.getByText(/Active \d+ of \d+ days this week/)).toBeVisible();
  await expect(ibrahim.getByText(/prayers/)).toHaveCount(0);

  // Yusuf keeps Quran secret: full detail, but no Quran chip at all
  const yusuf = rows.filter({ hasText: 'Yusuf' });
  await expect(yusuf.getByText(/prayers/)).toBeVisible();
  await expect(yusuf.getByText(/āyāt|Quran/)).toHaveCount(0);

  // The quiet framing line with its verified citation
  await expect(
    page.getByText('Noor is your consistency, not your worth.', { exact: false })
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ṣaḥīḥ al-Bukhārī 6464' })).toHaveAttribute(
    'href',
    'https://sunnah.com/bukhari:6464'
  );
});
