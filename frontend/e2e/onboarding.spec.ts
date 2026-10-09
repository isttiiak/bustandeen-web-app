import { expect, test, type Page } from '@playwright/test';

// T3.3 first-run setup (pages/Onboarding.tsx, utils/onboarding.ts). The demo
// has no server record, so it behaves like an existing account: a Home card,
// never the forced flow. The zone is pinned to Asia/Dhaka, so Bangladesh's
// usual Ḥanafī ʿAṣr + Karachi method are preselected.

async function demoHome(page: Page) {
  await page.goto('/');
  await page.getByRole('link', { name: /Explore as Brother/ }).click();
  await expect(page.getByText('Demo Mode')).toBeVisible();
}

const setupCard = (page: Page) => page.getByTestId('home-setup-card');

test.beforeEach(async ({ context }) => {
  await context.route(
    (url) => url.hostname !== 'localhost',
    (route) => route.abort()
  );
});

test('the Home card walks through location, madhab and habits, then orders Home', async ({
  page,
}) => {
  await demoHome(page);
  await setupCard(page).getByRole('link', { name: 'Set up' }).click();
  await expect(page).toHaveURL(/\/welcome$/);

  // 1. Location, found on-device
  await expect(page.getByRole('heading', { name: 'Where do you pray?' })).toBeVisible();
  await page.getByPlaceholder(/Dhaka, London/).fill('Dhaka');
  await page.getByPlaceholder(/Dhaka, London/).press('Enter');
  await expect(page.getByTestId('onboarding-location')).toContainText('Dhaka');
  await page.getByRole('button', { name: 'Next', exact: true }).click();

  // 2. Prayer times: the country's usual school is preselected, both ʿAṣr
  // times are shown, and the choice is the user's.
  await expect(page.getByRole('heading', { name: 'Your prayer times' })).toBeVisible();
  const hanafi = page.getByRole('radio', { name: /Ḥanafī/ });
  const standard = page.getByRole('radio', { name: /Shāfiʿī, Mālikī, Ḥanbalī/ });
  await expect(hanafi).toHaveAttribute('aria-checked', 'true');
  await expect(hanafi).toContainText('Usual in Bangladesh');
  await expect(hanafi).toContainText(/ʿAṣr today: \d/);
  await expect(standard).toContainText(/ʿAṣr today: \d/);
  await expect(page.getByLabel('Calculation method')).toHaveValue('Karachi');
  await standard.click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();

  // 3. Habits: up to three, with starting goals
  await expect(
    page.getByRole('heading', { name: 'What would you like to grow first?' })
  ).toBeVisible();
  for (const h of ['Quran', 'Salat', 'Zikr']) {
    await page.getByRole('button', { name: new RegExp(`^${h}`) }).click();
  }
  await expect(page.getByRole('button', { name: /^Fasting/ })).toBeDisabled();
  await expect(page.getByText('3 of 3 chosen')).toBeVisible();
  await page
    .getByRole('radiogroup', { name: 'Daily Quran goal' })
    .getByRole('radio', { name: '20 āyāt' })
    .click();
  await page.getByRole('button', { name: 'Start', exact: true }).click();

  // Back on Home: no card, chosen habits first, choices stored
  await expect(page).toHaveURL(/\/$/);
  await expect(setupCard(page)).toHaveCount(0);
  const cards = page.getByTestId('today-goals').locator('a');
  await expect(cards.first()).toHaveAttribute('href', '/quran');
  await expect(cards.nth(1)).toHaveAttribute('href', '/salat');
  await expect(cards.nth(2)).toHaveAttribute('href', '/zikr');
  const stored = await page.evaluate(() => ({
    asr: localStorage.getItem('bustandeen_asr_madhab'),
    method: localStorage.getItem('bustandeen_calc_method'),
    focus: localStorage.getItem('bustandeen_focus_habits'),
    location: localStorage.getItem('bustandeen_location'),
  }));
  expect(stored.asr).toBe('standard');
  expect(stored.method).toBe('Karachi');
  expect(JSON.parse(stored.focus!)).toEqual(['quran', 'salat', 'zikr']);
  expect(stored.location).toContain('Dhaka');
});

test('"No thanks" hides the card for good', async ({ page }) => {
  await demoHome(page);
  await setupCard(page).getByRole('button', { name: 'No thanks' }).click();
  await expect(setupCard(page)).toHaveCount(0);
  // In-app navigation (a reload would end the demo).
  await page.locator('a[href="/zikr"]').first().click();
  await expect(page).toHaveURL(/\/zikr$/);
  await page.goBack();
  await expect(page.locator('a[href="/zikr"]').first()).toBeVisible();
  await expect(setupCard(page)).toHaveCount(0);
});

test('Skip setup returns Home and nothing is chosen for the user', async ({ page }) => {
  await demoHome(page);
  await setupCard(page).getByRole('link', { name: 'Set up' }).click();
  await page.getByRole('button', { name: 'Skip setup' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(setupCard(page)).toHaveCount(0);
  const stored = await page.evaluate(() => ({
    asr: localStorage.getItem('bustandeen_asr_madhab'),
    focus: localStorage.getItem('bustandeen_focus_habits'),
  }));
  expect(stored).toEqual({ asr: null, focus: null });
});

test('the setup is in Bangla when the app is', async ({ page, context }) => {
  await context.addInitScript(() => localStorage.setItem('bustandeen_lang', 'bn'));
  await page.goto('/');
  await page.getByRole('link', { name: /Explore as Brother/ }).click();
  await expect(page.getByText('ডেমো মোড')).toBeVisible();
  await setupCard(page).getByRole('link', { name: 'সাজিয়ে নিন' }).click();
  await expect(page.getByRole('heading', { name: 'আপনি কোথায় সালাত আদায় করেন?' })).toBeVisible();
  await page.getByRole('button', { name: 'অবস্থান ছাড়াই এগিয়ে যান' }).click();
  await expect(page.getByRole('radio', { name: /হানাফী/ })).toContainText('বাংলাদেশ-এ প্রচলিত');
});
