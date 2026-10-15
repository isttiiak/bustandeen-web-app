import { expect, test } from '@playwright/test';

// The static pages' globe menu (2026-10-15): no language name in the header,
// a menu of the page's languages, and "Request a language" that opens a small
// form posting to the Feedback inbox (POST /api/feedback/language, mocked).

test.beforeEach(async ({ context }) => {
  await context.route(
    (url) => url.hostname !== 'localhost',
    (route) => route.abort()
  );
});

test('the globe menu lists the languages and sends a language request', async ({ page }) => {
  const sent: unknown[] = [];
  await page.route('**/api/feedback/language', async (route) => {
    sent.push(route.request().postDataJSON());
    await route.fulfill({ json: { ok: true } });
  });
  await page.goto('/duas/travel');
  // The header shows a globe only: the menu's names are inside the closed menu.
  await expect(page.locator('details[data-lang-menu] > summary')).toHaveText('');

  await page.locator('summary[aria-label="Language"]').click();
  await expect(page.getByRole('link', { name: 'বাংলা' })).toHaveAttribute(
    'href',
    '/bn/duas/travel'
  );
  await expect(page.getByRole('link', { name: 'English' })).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('a[hreflang="ar"]')).toHaveCount(0);

  // Opened by mistake: Cancel closes it, nothing is sent.
  await page.getByRole('button', { name: 'Request a language' }).click();
  const dialog = page.getByRole('dialog', { name: 'Request a language' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('textbox', { name: 'Request' })).toHaveValue('Language request');
  await expect(dialog.getByRole('textbox', { name: 'Language' })).toHaveValue('');
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();
  expect(sent).toEqual([]);

  await page.locator('summary[aria-label="Language"]').click();
  await page.getByRole('button', { name: 'Request a language' }).click();
  await dialog.getByRole('textbox', { name: 'Language' }).fill('Urdu');
  await dialog.getByRole('button', { name: 'Send' }).click();
  await expect(dialog.getByRole('status')).toHaveText(
    'JazakAllahu khayran. Your request has reached us.'
  );
  expect(sent).toEqual([{ language: 'Urdu', botcheck: '' }]);
  await expect(dialog).toBeHidden({ timeout: 5000 });
});

test('a failed send says so and keeps the form', async ({ page }) => {
  await page.route('**/api/feedback/language', (route) => route.fulfill({ status: 500 }));
  await page.goto('/bn/duas/travel');
  await page.locator('summary[aria-label="ভাষা"]').click();
  await page.getByRole('button', { name: 'ভাষার অনুরোধ' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'ভাষা' }).fill('উর্দু');
  await dialog.getByRole('button', { name: 'পাঠান' }).click();
  await expect(dialog.getByRole('status')).toHaveText(
    'পাঠানো যায়নি। কিছুক্ষণ পরে আবার চেষ্টা করুন।'
  );
  await expect(dialog.getByRole('textbox', { name: 'ভাষা' })).toBeEnabled();
});

test('city pages offer only their languages: London English, Dhaka also Bangla', async ({
  page,
}) => {
  await page.goto('/prayer-times/london-united-kingdom');
  await page.locator('summary[aria-label="Language"]').click();
  await expect(page.locator('details[data-lang-menu] a[hreflang]')).toHaveCount(1);
  await page.goto('/prayer-times/dhaka-bangladesh');
  await page.locator('summary[aria-label="Language"]').click();
  await expect(page.locator('details[data-lang-menu] a[hreflang]')).toHaveCount(2);
});

test('the app navbar shows a globe only, and it switches the language', async ({ page }) => {
  await page.goto('/demo/brother');
  await expect(page.getByText('Demo Mode').first()).toBeVisible();
  const globe = page.getByRole('button', { name: 'Switch language' });
  await expect(globe).toHaveText('');
  await globe.click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('bustandeen_lang'))).toBe('bn');
});

test('the Feedback page has "Request a language", chosen by ?type=language', async ({ page }) => {
  await page.goto('/feedback?type=language');
  await expect(page.getByRole('button', { name: /Request a language/ })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
});
