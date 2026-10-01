import { expect, test, type Page } from '@playwright/test';

// Quran and hadith references inside translated sentences must render with
// their links. Until v5.75.0 several <Trans> sentences mapped their tags by
// child position, and the Ramadan page showed "(Quran 97:3, ). Duʿā of the
// night: )..." with Bukhārī 2017, Bukhārī 1899 and the duʿā missing.

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

async function demoAt(page: Page, path: string) {
  await page.goto('/');
  await page.getByRole('link', { name: /Explore as Brother/ }).click();
  // The demo link is a page load (/demo/brother): wait for the app.
  await expect(page.getByText('Demo Mode')).toBeVisible();
  await page.evaluate((p) => {
    window.history.pushState({}, '', p);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);
}

test('Ramadan, last ten nights: every citation renders with its link', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2027-02-28T14:00:00+06:00')); // 21 Ramaḍān 1448
  await demoAt(page, '/ramadan');
  for (const [text, href] of [
    ['Quran 97:3', 'https://quran.com/97/3'],
    ['Bukhārī 2017', 'https://sunnah.com/bukhari:2017'],
    ['Tirmidhī 3513', 'https://sunnah.com/tirmidhi:3513'],
    ['Bukhārī 1899', 'https://sunnah.com/bukhari:1899'],
    ['Muslim 335', 'https://sunnah.com/muslim:335'],
  ]) {
    await expect(page.getByRole('link', { name: text, exact: true }).first()).toHaveAttribute(
      'href',
      href
    );
  }
  await expect(
    page.getByText('Allāhumma innaka ʿafuwwun tuḥibbul-ʿafwa faʿfu ʿannī').first()
  ).toBeVisible();
});

test('Salat legend: highlighted words are present', async ({ page }) => {
  await demoAt(page, '/salat');
  await page.getByRole('button', { name: /How it works/i }).click();
  await expect(
    page.getByText(/Choose 33·33·33 \+ tahlīl \(Muslim 597a\) or 33·33·34/)
  ).toBeVisible();
  await expect(page.getByText(/Tapping Ayatul Kursi \(in/)).toBeVisible();
  await expect(page.getByText(/Turn off Auto-count dhikr in salat settings/)).toBeVisible();
});
