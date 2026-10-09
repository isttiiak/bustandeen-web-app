import { expect, test, type Page } from '@playwright/test';

// T3.4 E: Home's per-habit quick sections (Quran, Zikr, Fasting next to the
// Salat timeline) in the habit order, with their settings. Frozen clock in
// Dhaka with a saved location; Thursday 2026-10-15 is a Monday/Thursday fast.

test.beforeEach(async ({ context }) => {
  await context.route(
    (url) => url.hostname !== 'localhost',
    (route) => route.abort()
  );
});

async function demoHomeAt(page: Page, at: string, storage: Record<string, string> = {}) {
  await page.clock.setFixedTime(new Date(at));
  await page.context().addInitScript((extra) => {
    localStorage.setItem(
      'bustandeen_location',
      JSON.stringify({ latitude: 23.81, longitude: 90.41, name: 'Dhaka' })
    );
    for (const [k, v] of Object.entries(extra)) localStorage.setItem(k, v);
  }, storage);
  await page.goto('/demo/brother');
  await expect(page.getByText('Demo Mode').first()).toBeVisible();
}

const order = (page: Page) =>
  page
    .locator('[data-testid="today-timeline"], [data-testid^="quick-"]')
    .evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')));

test('sections follow the habit order; Today’s goals stay', async ({ page }) => {
  await demoHomeAt(page, '2026-10-15T20:00:00+06:00');
  expect(await order(page)).toEqual([
    'today-timeline',
    'quick-zikr',
    'quick-quran',
    'quick-fasting',
  ]);
  await expect(page.getByTestId('today-goals')).toBeVisible();
});

test('a custom order and a section turned off', async ({ page }) => {
  await demoHomeAt(page, '2026-10-15T20:00:00+06:00', {
    bustandeen_focus_habits: JSON.stringify(['fasting', 'quran', 'salat', 'zikr']),
    bustandeen_home_sections_off: JSON.stringify(['quran']),
  });
  expect(await order(page)).toEqual(['quick-fasting', 'today-timeline', 'quick-zikr']);
});

test('Quran: Continue (khatam in the demo), Listen and Pick a surah', async ({ page }) => {
  await demoHomeAt(page, '2026-10-15T20:00:00+06:00');
  const card = page.getByTestId('quick-quran');
  // The khatam position needs the surah list (network, blocked here): until
  // it loads, Continue opens the Khatam page itself.
  await expect(card.getByRole('link', { name: 'Continue khatam' })).toHaveAttribute(
    'href',
    /\/quran\/(khatam|read\/\d+\?start=\d+&mode=khatam)$/
  );
  await expect(card.getByRole('link', { name: 'Listen' })).toHaveAttribute('href', '/quran/listen');
  await expect(card.getByRole('link', { name: 'Pick a surah' })).toHaveAttribute(
    'href',
    '/quran/browse'
  );
});

test('Zikr: a chip opens the counter with its number as the target', async ({ page }) => {
  await demoHomeAt(page, '2026-10-15T20:00:00+06:00');
  const chip = page.getByRole('button', { name: 'Count Astaghfirullah, target 100' });
  await chip.click();
  await expect(page).toHaveURL(/\/zikr\?type=Astaghfirullah&target=100$/);
  await expect(page.getByText(/of 100/).first()).toBeVisible();
});

test('Zikr: with the "add" action a chip adds its number at once', async ({ page }) => {
  await demoHomeAt(page, '2026-10-15T20:00:00+06:00', {
    bustandeen_zikr_quick_action: 'add',
  });
  const card = page.getByTestId('quick-zikr');
  await card.getByRole('button', { name: 'Add 100 La ilaha illallah' }).click();
  await expect(card).toContainText('100');
});

test('Fasting: Yes logs today’s sunnah fast, Broke marks it, a second tap undoes', async ({
  page,
}) => {
  await demoHomeAt(page, '2026-10-15T09:00:00+06:00');
  const card = page.getByTestId('quick-fasting');
  await expect(card).toContainText('Monday / Thursday');
  const yes = card.getByRole('button', { name: 'Yes' });
  await expect(card.getByRole('button', { name: 'Broke' })).toHaveCount(0);
  await yes.click();
  await expect(yes).toHaveAttribute('aria-pressed', 'true');
  await card.getByRole('button', { name: 'Broke' }).click();
  await expect(card.getByRole('button', { name: 'Broken' })).toBeVisible();
  await card.getByRole('button', { name: 'Broken' }).click();
  await expect(card.getByRole('button', { name: 'Yes' })).toHaveAttribute('aria-pressed', 'false');
});

test('Fasting: on a lone Friday Yes opens the Fasting page instead', async ({ page }) => {
  await demoHomeAt(page, '2026-10-16T09:00:00+06:00');
  await page.getByTestId('quick-fasting').getByRole('button', { name: 'Yes' }).click();
  await expect(page).toHaveURL(/\/fasting$/);
});

test('Settings lists the sections in order with switches', async ({ page }) => {
  await demoHomeAt(page, '2026-10-15T20:00:00+06:00');
  await page.evaluate(() => {
    window.history.pushState({}, '', '/settings');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  const group = page.getByRole('group', { name: 'Home sections' });
  await expect(group.locator('[data-section]')).toHaveCount(4);
  const rows = () =>
    group
      .locator('[data-section]')
      .evaluateAll((els) => els.map((e) => e.getAttribute('data-section')));
  expect(await rows()).toEqual(['salat', 'zikr', 'quran', 'fasting']);
  await group.getByRole('button', { name: 'Move Fasting up' }).click();
  expect(await rows()).toEqual(['salat', 'zikr', 'fasting', 'quran']);
  await group.getByRole('checkbox', { name: 'Show Zikr on Home' }).uncheck();
  const stored = await page.evaluate(() => ({
    order: localStorage.getItem('bustandeen_focus_habits'),
    off: localStorage.getItem('bustandeen_home_sections_off'),
  }));
  expect(JSON.parse(stored.order!)).toEqual(['salat', 'zikr', 'fasting', 'quran']);
  expect(JSON.parse(stored.off!)).toEqual(['zikr']);
});
