import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// U10 "explore freely, sign in to save": a guest sees the real pages. The
// first save opens one shared sheet with a reason (never a lock), the zikr
// counter is never interrupted, pages built from a record show a preview
// gate whose "See an example" opens the demo, Rayhanah and Friends are view
// only, and the landing has no brother/sister demo buttons.

test.use({ colorScheme: 'dark' });

test.beforeEach(async ({ context }) => {
  await context.route(
    (url) => url.hostname !== 'localhost',
    (route) => route.abort()
  );
});

const sheet = (page: Page) => page.getByRole('dialog');

/** Controls under 44x44 (own box or `hit-44` area); inline links are exempt. */
async function smallTargets(page: Page, within: string): Promise<string[]> {
  return page.evaluate((root) => {
    const big = (w: number, h: number) => w >= 43.5 && h >= 43.5;
    const out: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>(`${root} a[href], ${root} button`)) {
      const r = el.getBoundingClientRect();
      if (!r.width || (el.tagName === 'A' && getComputedStyle(el).display === 'inline')) continue;
      if (big(r.width, r.height)) continue;
      const after = getComputedStyle(el, '::after');
      if (after.content !== 'none' && big(parseFloat(after.width), parseFloat(after.height)))
        continue;
      out.push(`${Math.round(r.width)}x${Math.round(r.height)} ${el.outerHTML.slice(0, 100)}`);
    }
    return out;
  }, within);
}

async function axe(page: Page, include: string) {
  const res = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .include(include)
    .analyze();
  return res.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' ')}`);
}

test('Salat: a guest tap on Done opens the sheet, Keep exploring changes nothing', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/salat');
  await page.getByRole('button', { name: 'Done' }).first().click();
  await expect(sheet(page)).toBeVisible();
  await expect(sheet(page).getByRole('heading', { name: 'Keep your prayer record' })).toBeVisible();
  await expect(sheet(page).getByRole('button', { name: 'Create free account' })).toBeFocused();
  expect(await smallTargets(page, '[role=dialog]')).toEqual([]);
  expect(await axe(page, '[role=dialog]')).toEqual([]);

  await sheet(page).getByRole('button', { name: 'Keep exploring' }).click();
  await expect(sheet(page)).toHaveCount(0);
  await expect(page).toHaveURL(/\/salat$/);
  expect(await page.evaluate(() => localStorage.getItem('bustandeen_salat_outbox'))).toBeNull();

  // Sign in keeps the way back to this page.
  await page.getByRole('button', { name: 'Done' }).first().click();
  await sheet(page).getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate(() => sessionStorage.getItem('bustandeen_redirect'))).toBe('/salat');
});

test('Fasting: a guest save opens the same sheet with its own reason', async ({ page }) => {
  await page.goto('/fasting');
  await page.getByRole('button', { name: 'I fasted today' }).click();
  await expect(
    sheet(page).getByRole('heading', { name: 'Keep your fasting record' })
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(sheet(page)).toHaveCount(0);
});

test('Zikr: counting is never interrupted, the counts carry to sign-up', async ({ page }) => {
  await page.goto('/zikr');
  const count = page.getByRole('button', { name: 'Count', exact: true });
  await count.click();
  const box = await count.boundingBox();
  await count.click();
  await count.click();
  await expect(page.getByTestId('zikr-count')).toHaveText('3');
  await expect(sheet(page)).toHaveCount(0);
  const note = page.getByTestId('zikr-guest-note');
  await expect(note).toContainText('3 on this device, not in your record yet.');
  // The note sits below Count: the button did not move.
  expect(await count.boundingBox()).toEqual(box);

  await note.getByRole('button', { name: 'Save them' }).click();
  await expect(sheet(page).getByRole('heading', { name: 'Save your zikr' })).toBeVisible();
  await sheet(page).getByRole('button', { name: 'Create free account' }).click();
  await expect(page).toHaveURL(/\/signup$/);
  expect(await page.evaluate(() => sessionStorage.getItem('bustandeen_redirect'))).toBe('/zikr');
  // The taps are still on this device, ready for the first flush after sign-in.
  await page.goBack();
  await expect(page.getByTestId('zikr-count')).toHaveText('3');
  await expect(page.getByTestId('zikr-guest-note')).toBeVisible();
  // ...and through a reload (Firebase's "no user" for a guest wipes nothing).
  await page.reload();
  await expect(page.getByTestId('zikr-count')).toHaveText('3');
});

test('Analytics: a preview gate, and "See an example" opens the demo there', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/salat/analytics');
  const gate = page.getByTestId('preview-gate');
  await expect(gate.getByRole('heading', { name: 'See your journey take shape' })).toBeVisible();
  await expect(gate.getByText('Example', { exact: true })).toBeVisible();
  await expect(page.getByText('Sign in required')).toHaveCount(0);
  expect(await smallTargets(page, '[data-testid=preview-gate]')).toEqual([]);
  expect(await axe(page, '[data-testid=preview-gate]')).toEqual([]);

  await gate.getByRole('button', { name: 'See an example' }).click();
  await expect(page.getByText('Demo Mode')).toBeVisible();
  await expect(page).toHaveURL(/\/salat\/analytics$/);
  await expect(page.getByTestId('preview-gate')).toHaveCount(0);
});

test('Settings: the gate gives the reason, no lock', async ({ page }) => {
  await page.goto('/settings');
  await expect(
    page.getByTestId('preview-gate').getByRole('heading', { name: 'This space is yours to fill' })
  ).toBeVisible();
});

test('Rayhanah is view only: Log today opens the privacy sheet', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/cycle');
  const view = page.getByTestId('guest-rayhanah');
  await expect(
    view.getByText('Encrypted, never shared with friends, never sent to any AI.')
  ).toBeVisible();
  expect(await smallTargets(page, '[data-testid=guest-rayhanah]')).toEqual([]);
  expect(await axe(page, '[data-testid=guest-rayhanah]')).toEqual([]);
  await view.getByRole('button', { name: 'Log today' }).click();
  await expect(
    sheet(page).getByRole('heading', { name: 'Start Rayhanah privately' })
  ).toBeVisible();
});

test('Friends is view only: no add or invite, one card with the reason', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/friends');
  const view = page.getByTestId('guest-friends');
  await expect(view.getByRole('heading', { name: 'Friends need an account' })).toBeVisible();
  await expect(page.getByRole('button', { name: /add friend|invite/i })).toHaveCount(0);
  expect(await smallTargets(page, '[data-testid=guest-friends]')).toEqual([]);
  expect(await axe(page, '[data-testid=guest-friends]')).toEqual([]);
});

test('the landing opens the real pages, no brother/sister demo', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('a[href^="/demo/"]')).toHaveCount(0);
  for (const href of ['/salat', '/zikr', '/quran/browse', '/fasting', '/friends', '/cycle'])
    await expect(page.locator(`a[href="${href}"]`).first()).toBeVisible();
  await page.getByRole('link', { name: 'Explore the app first' }).click();
  await expect(page).toHaveURL(/\/salat$/);
  await expect(page.getByRole('button', { name: 'Done' }).first()).toBeVisible();
});
