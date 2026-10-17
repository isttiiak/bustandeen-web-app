import { expect, test, type Page } from '@playwright/test';

// R0b (v5.182.0): where the place's country default is matched to its
// official timetable (R0a/R0c/R0d), Prayer time settings says so under the
// calculation method; elsewhere it says nothing.

test.beforeEach(async ({ context }) => {
  await context.route(
    (url) => url.hostname !== 'localhost',
    (route) => route.abort()
  );
});

async function settingsAt(
  page: Page,
  place: { latitude: number; longitude: number; name: string }
) {
  await page.context().addInitScript((p) => {
    localStorage.setItem('bustandeen_location', JSON.stringify(p));
  }, place);
  await page.goto('/demo/brother');
  await expect(page.getByText('Demo Mode').first()).toBeVisible();
  await page.evaluate(() => {
    window.history.pushState({}, '', '/prayer-times');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await page.getByRole('button', { name: 'Prayer time settings' }).first().click();
  await expect(page.getByRole('dialog', { name: 'Prayer time settings' })).toBeVisible();
}

test.describe('in Istanbul', () => {
  test.use({ timezoneId: 'Europe/Istanbul' });
  test("with Turkey's own method the note says the times are matched; with another, nothing", async ({
    page,
  }) => {
    await settingsAt(page, { latitude: 41.0138, longitude: 28.9497, name: 'Istanbul' });
    const method = page.getByLabel('Calculation method');
    await method.selectOption('Turkey');
    await expect(page.getByTestId('calc-method-matched')).toContainText(
      /^In (Turkey|Türkiye), these times are matched to the country's published timetable and kept on the safe side/
    );
    await method.selectOption('MuslimWorldLeague');
    await expect(page.getByTestId('calc-method-matched')).toHaveCount(0);
  });
});

test.describe('in London', () => {
  test.use({ timezoneId: 'Europe/London' });
  test('only iftar is matched', async ({ page }) => {
    await settingsAt(page, { latitude: 51.5085, longitude: -0.1257, name: 'London' });
    await page.getByLabel('Calculation method').selectOption('MoonsightingCommittee');
    await expect(page.getByTestId('calc-method-matched')).toContainText(
      'iftar is matched to a published local timetable'
    );
  });
});

test.describe('in Paris', () => {
  test.use({ timezoneId: 'Europe/Paris' });
  test('no note where nothing was matched', async ({ page }) => {
    await settingsAt(page, { latitude: 48.8534, longitude: 2.3488, name: 'Paris' });
    await expect(page.getByLabel('Calculation method')).toBeVisible();
    await expect(page.getByTestId('calc-method-matched')).toHaveCount(0);
  });
});
