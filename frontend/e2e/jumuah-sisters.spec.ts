import { expect, test, type Page } from '@playwright/test';
import { AT, enterDemo, go } from './characterize.js';

// Jumu'ah is not obligatory for women (Sunan Abū Dāwūd 1067, ṣaḥīḥ): a sister's Friday
// Dhuhr is an ordinary Ẓuhr (at home, or Jumu'ah with the imam if she goes), and the
// Friday page gives brothers and sisters their own guidance.

test.beforeEach(async ({ context }) => {
  await context.route(
    (url) => url.hostname !== 'localhost',
    (route) => route.abort()
  );
});

async function declineBanner(page: Page) {
  const no = page.getByRole('button', { name: 'No thanks', exact: true });
  if (await no.isVisible()) await no.click();
}

/** The prayer card whose name line starts with `name` (the line also holds badges, e.g. "now"). */
const card = (page: Page, name: RegExp) =>
  page
    .locator('main .rounded-card')
    .filter({ has: page.locator('p', { hasText: name }) })
    .first();

test("salat: a sister's Friday Dhuhr is an ordinary Ẓuhr, at the place she picks", async ({
  page,
}) => {
  await enterDemo(page, { as: 'sister', at: AT.friday });
  await go(page, '/salat');
  await declineBanner(page);
  await expect(page.locator('main .rounded-card p', { hasText: /^Jumu'ah/ })).toHaveCount(0);
  await expect(page.getByText('Replaces Dhuhr, prayed at the mosque')).toHaveCount(0);
  const dhuhr = card(page, /^Dhuhr/);
  await expect(dhuhr).toBeVisible();

  // The demo has Friday's Dhuhr done by 12:30; open its details.
  const done = dhuhr.getByRole('button', { name: 'Done', exact: true });
  const details = dhuhr.getByRole('button', { name: /^Details/ });
  if (!(await details.isVisible())) await done.click();
  if (await details.isVisible()) await details.click();
  await expect(
    dhuhr.getByText("Prayed Jumu'ah with the imam at the mosque? Choose At Mosque.")
  ).toBeVisible();
  await expect(dhuhr.getByRole('button', { name: /At Home/ })).toBeVisible();
  await expect(dhuhr.getByRole('button', { name: /At Mosque/ })).toBeVisible();
  await expect(page.getByText('Marked at the mosque automatically.', { exact: false })).toHaveCount(
    0
  );
});

test("salat: a brother's Friday Dhuhr is still Jumu'ah at the mosque", async ({ page }) => {
  await enterDemo(page, { as: 'brother', at: AT.friday });
  await go(page, '/salat');
  await declineBanner(page);
  const jumuah = card(page, /^Jumu'ah/);
  await expect(jumuah).toBeVisible();
  await expect(jumuah.getByText('Replaces Dhuhr, prayed at the mosque')).toBeVisible();
});

const SISTER_ITEM = 'Pray Ẓuhr, 4 rakʿahs, at home';
const BROTHER_ITEM = "Attend Jumu'ah prayer in congregation at a mosque";

test('the Friday page gives a sister her own guidance', async ({ page }) => {
  await enterDemo(page, { as: 'sister', at: AT.friday });
  await go(page, '/special-day/friday');
  await expect(page.getByRole('heading', { name: 'For sisters' })).toBeVisible();
  await expect(page.getByText(SISTER_ITEM)).toBeVisible();
  await expect(
    page.getByText('If you go, dress modestly and fully covered, without perfume')
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'For brothers' })).toHaveCount(0);
  await expect(page.getByText(BROTHER_ITEM)).toHaveCount(0);
  // Shared guidance stays.
  await expect(page.getByText('Read Surah Al-Kahf (Quran 18)')).toBeVisible();
});

test('the Friday page gives a brother his own guidance', async ({ page }) => {
  await enterDemo(page, { as: 'brother', at: AT.friday });
  await go(page, '/special-day/friday');
  await expect(page.getByRole('heading', { name: 'For brothers' })).toBeVisible();
  await expect(page.getByText(BROTHER_ITEM)).toBeVisible();
  await expect(page.getByText('Listen to the khutbah in silence')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'For sisters' })).toHaveCount(0);
  await expect(page.getByText(SISTER_ITEM)).toHaveCount(0);
});

test('a guest sees both, each under its own heading', async ({ page }) => {
  await page.goto('/special-day/friday');
  await expect(page.getByRole('heading', { name: 'For brothers' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'For sisters' })).toBeVisible();
  await expect(page.getByText(BROTHER_ITEM)).toBeVisible();
  await expect(page.getByText(SISTER_ITEM)).toBeVisible();
});

test("salat analytics shows a brother his Jumu'ah attendance rate", async ({ page }) => {
  await enterDemo(page, { as: 'brother', at: AT.friday });
  await go(page, '/salat/analytics');
  await expect(page.getByText(/Jumu'ah attendance/i).first()).toBeVisible();
});

test("salat analytics shows a sister no Jumu'ah attendance rate", async ({ page }) => {
  await enterDemo(page, { as: 'sister', at: AT.friday });
  await go(page, '/salat/analytics');
  await expect(page.getByText(/Kaza Owed/i).first()).toBeVisible();
  await expect(page.getByText(/Jumu'ah attendance/i)).toHaveCount(0);
});

test('the Eid page invites a sister to the gathering, also during her period', async ({ page }) => {
  await enterDemo(page, { as: 'sister' });
  await go(page, '/special-day/eid_fitr');
  await expect(page.getByRole('heading', { name: 'For sisters' })).toBeVisible();
  await expect(page.getByText('Attend the Eid gathering', { exact: true })).toBeVisible();
  await expect(page.getByText(/during your period, attend and join the takbīr/)).toBeVisible();
});

test('Laylat al-Qadr: Fajr in congregation for a brother, not shown to a sister', async ({
  page,
}) => {
  await enterDemo(page, { as: 'brother' });
  await go(page, '/special-day/laylat_qadr');
  await expect(page.getByText('Pray Fajr in congregation, completing the night')).toBeVisible();
  await expect(page.getByText('Pray Fajr on time, completing the night')).toHaveCount(0);
  await expect(page.getByText('Attend the Eid gathering')).toHaveCount(0);
});
