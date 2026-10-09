import { expect, test, type Page } from '@playwright/test';

// T4.3 guided morning/evening adhkar (/library/adhkar). Frozen clock in Dhaka
// with a saved location, demo mode: Home's morning card (Fajr→sunrise) opens
// the routine, the counter advances, progress shows on Home, and finishing
// marks the routine done.

async function demoHomeAt(page: Page, at: string) {
  await page.clock.setFixedTime(new Date(at));
  await page.context().addInitScript(() => {
    localStorage.setItem(
      'bustandeen_location',
      JSON.stringify({ latitude: 23.81, longitude: 90.41, name: 'Dhaka' })
    );
  });
  await page.goto('/');
  await page.getByRole('link', { name: /Explore as Brother/ }).click();
  await expect(page.getByText('Demo Mode')).toBeVisible();
}

const step = (page: Page) => page.getByTestId('adhkar-card').locator('p').first();

test.beforeEach(async ({ context }) => {
  await context.route(
    (url) => url.hostname !== 'localhost',
    (route) => route.abort()
  );
});

test('guided routine: Tanzil text, counter, auto-advance, progress on Home, done', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await demoHomeAt(page, '2026-10-15T05:00:00+06:00');

  const card = page.getByTestId('home-adhkar-card');
  await expect(card).toContainText('Morning adhkār');
  await card.click();
  await expect(page).toHaveURL(/\/library\/adhkar\?period=morning/);

  // Āyat al-Kursī comes from the bundled Tanzil text, with the credit.
  await expect(step(page)).toHaveText('1 of 7');
  const kursi = await page.evaluate(async () => {
    const s = (await (await fetch('/quran/uthmani/2.json')).json()) as { ayahs: string[] };
    return s.ayahs[254];
  });
  await expect(page.getByTestId('adhkar-card').locator('[lang="ar"]')).toHaveText(kursi);
  await expect(page.getByRole('link', { name: 'Tanzil' })).toBeVisible();

  // One tap finishes a 1x item and the next one opens by itself.
  await page.getByTestId('adhkar-counter').click();
  await expect(step(page)).toHaveText('2 of 7');
  // A 3x item needs three taps.
  await page.getByTestId('adhkar-counter').click();
  await expect(page.getByTestId('adhkar-counter')).toHaveAccessibleName(/1\/3/);
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(step(page)).toHaveText('1 of 7');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(step(page)).toHaveText('3 of 7');
  await expect(page.getByTestId('adhkar-progress')).toContainText('2/7');

  // "Show all" lists the whole routine.
  await page.getByRole('button', { name: 'Show all' }).click();
  await expect(page.locator('h2')).toHaveCount(7);
  await page.getByRole('button', { name: 'One at a time' }).click();

  // Home shows this device's progress.
  await page.goBack();
  await expect(page.getByTestId('home-adhkar-card')).toContainText('2 of 7 read');

  // Finish the rest: done, and Home says so.
  await page.getByTestId('home-adhkar-card').click();
  for (let i = 0; i < 5; i++) await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByTestId('adhkar-complete')).toContainText('Morning adhkar complete');
  await expect(page.getByTestId('adhkar-complete')).toContainText('Saved as done for today');
  await expect(page.locator('body')).not.toHaveCSS('overflow-x', 'scroll');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await page.goBack();
  await expect(page.getByTestId('home-adhkar-card')).toContainText('Done for today');
});

test('evening routine has the evening wording and the scorpion du‘ā', async ({ page }) => {
  await demoHomeAt(page, '2026-10-15T17:50:00+06:00');
  await page.getByTestId('home-adhkar-card').click();
  await expect(page).toHaveURL(/period=evening/);
  await page.getByRole('button', { name: 'Show all' }).click();
  await expect(page.locator('h2')).toHaveCount(8);
  await expect(page.getByText('Amsaynā wa Amsal-Mulku Lillāh')).toBeVisible();
  await expect(page.getByText('Aʿūdhu bi-kalimātillāhit-tāmmāt')).toBeVisible();
  await expect(page.getByRole('link', { name: /Ṣaḥīḥ Muslim 2709/ })).toHaveAttribute(
    'href',
    'https://sunnah.com/muslim:2709a'
  );
});
