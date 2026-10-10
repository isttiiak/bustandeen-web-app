import { expect, test, type Page } from '@playwright/test';

// U5: Settings → Home. Quick sections (any subset), Today's goals card
// (on/off, its own row order, rows, badges) and the rule that at least one
// of them stays on. Demo mode, frozen clock in Dhaka with a saved location.

test.beforeEach(async ({ context }) => {
  await context.route(
    (url) => url.hostname !== 'localhost',
    (route) => route.abort()
  );
});

async function demoAt(page: Page, storage: Record<string, string> = {}) {
  await page.clock.setFixedTime(new Date('2026-10-15T20:00:00+06:00'));
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

const go = (page: Page, path: string) =>
  page.evaluate((p) => {
    window.history.pushState({}, '', p);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);

const goalLinks = (page: Page) =>
  page
    .getByTestId('today-goals')
    .locator('a')
    .evaluateAll((els) => els.map((e) => e.getAttribute('href')));

test('goal rows keep their own order, hide rows and badges', async ({ page }) => {
  await demoAt(page, {
    bustandeen_home_goals: JSON.stringify({
      on: true,
      order: ['fasting', 'quran', 'zikr', 'salat'],
      off: ['zikr'],
      badges: false,
    }),
  });
  await expect(page.getByTestId('today-goals')).toBeVisible();
  expect(await goalLinks(page)).toEqual(['/fasting', '/quran', '/salat']);
  // Badges off: no Ramadan countdown chip on the Fasting row
  await expect(page.getByTestId('today-goals').getByTitle(/Ramadan/)).toHaveCount(0);
  // The quick sections keep the habit order
  await expect(page.getByTestId('today-timeline')).toBeVisible();
});

test('goals card off: Home shows only the quick sections', async ({ page }) => {
  await demoAt(page, {
    bustandeen_home_goals: JSON.stringify({ on: false, off: [], badges: true }),
  });
  await expect(page.getByTestId('quick-zikr')).toBeVisible();
  await expect(page.getByTestId('today-goals')).toHaveCount(0);
});

test('every quick section off: the goals card stays (safety net)', async ({ page }) => {
  await demoAt(page, {
    bustandeen_home_timeline: '0',
    bustandeen_home_sections_off: JSON.stringify(['zikr', 'quran', 'fasting']),
    bustandeen_home_goals: JSON.stringify({ on: false, off: [], badges: true }),
  });
  await expect(page.getByTestId('today-goals')).toBeVisible();
  await expect(page.locator('[data-testid^="quick-"]')).toHaveCount(0);
  await expect(page.getByTestId('today-timeline')).toHaveCount(0);
});

test('Settings enforces the rule and saves the goals card', async ({ page }) => {
  await demoAt(page, {
    bustandeen_home_timeline: '0',
    bustandeen_home_sections_off: JSON.stringify(['quran', 'fasting']),
  });
  await go(page, '/settings');
  const quick = page.getByRole('group', { name: 'Quick sections' });
  const goals = page.getByRole('group', { name: "Today's goals" });
  const card = goals.getByRole('checkbox', { name: /Show Today's goals/ });

  // Zikr is the last quick section: the card can go, then Zikr is locked
  await card.uncheck();
  await expect(goals.getByTestId('home-goal-rows')).toHaveCount(0);
  await expect(quick.getByRole('checkbox', { name: 'Show Zikr on Home' })).toBeDisabled();
  await expect(page.getByRole('note')).toContainText('at least one');

  // Card back on, Zikr off: now the card is the last one and is locked
  await card.check();
  await quick.getByRole('checkbox', { name: 'Show Zikr on Home' }).uncheck();
  await expect(card).toBeDisabled();

  // Adhkār needs the timeline
  await expect(quick.getByRole('checkbox', { name: /Adhkār on the timeline/ })).toBeDisabled();

  // Reorder goal rows, hide one, badges off
  const rows = goals.getByTestId('home-goal-rows');
  await rows.getByRole('button', { name: 'Move Fasting up' }).click();
  await rows.getByRole('checkbox', { name: 'Show Quran on the goals card' }).uncheck();
  await goals.getByRole('checkbox', { name: /Streaks and badges/ }).uncheck();
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('bustandeen_home_goals') ?? 'null')
  );
  expect(stored).toEqual({
    on: true,
    order: ['salat', 'zikr', 'fasting', 'quran'],
    off: ['quran'],
    badges: false,
  });

  // The last goal row cannot be switched off
  for (const h of ['Salat', 'Zikr']) {
    await rows.getByRole('checkbox', { name: `Show ${h} on the goals card` }).uncheck();
  }
  await expect(
    rows.getByRole('checkbox', { name: 'Show Fasting on the goals card' })
  ).toBeDisabled();

  await go(page, '/');
  expect(await goalLinks(page)).toEqual(['/fasting']);
});
