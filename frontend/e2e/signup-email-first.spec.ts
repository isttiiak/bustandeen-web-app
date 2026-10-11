import { expect, test } from '@playwright/test';

// Email-first sign-up (v5.156.0): the form asks for no password and creates
// no account; it only emails a link. The link's page asks for the password.
// API answers are mocked; nothing leaves the machine.

const TOKEN = 't'.repeat(43);

test.beforeEach(async ({ context }) => {
  await context.route('**/api/auth/signup/**', async (route) => {
    const url = route.request().url();
    if (url.endsWith('/signup/start')) return route.fulfill({ json: { ok: true } });
    if (url.endsWith('/signup/check')) {
      const { token } = route.request().postDataJSON() as { token: string };
      return token === TOKEN
        ? route.fulfill({ json: { ok: true, email: 'new@example.dev', firstName: 'Amina' } })
        : route.fulfill({ status: 410, json: { ok: false, error: 'link_invalid' } });
    }
    return route.abort();
  });
  await context.route(
    (url) => url.hostname !== 'localhost' && !url.pathname.startsWith('/api/auth/signup/'),
    (route) => route.abort()
  );
});

test('step 1 has no password and ends on "check your inbox"', async ({ page }) => {
  let started: Record<string, unknown> | null = null;
  page.on('request', (req) => {
    if (req.url().endsWith('/api/auth/signup/start'))
      started = req.postDataJSON() as Record<string, unknown>;
  });
  await page.goto('/signup');
  await expect(page.getByLabel('Password', { exact: true })).toHaveCount(0);
  await page.getByLabel('First Name').fill('Amina');
  await page.getByRole('radio', { name: 'Sister' }).click();
  await page.getByLabel('Email').fill('new@example.dev');
  await page.getByRole('button', { name: 'Continue with email' }).click();

  await expect(page.getByRole('heading', { name: 'Check your inbox' })).toBeVisible();
  await expect(page.getByText('new@example.dev')).toBeVisible();
  await expect(page.getByText(/expires within 1 hour/)).toBeVisible();
  expect(started).toMatchObject({
    firstName: 'Amina',
    email: 'new@example.dev',
    gender: 'female',
    lang: 'en',
  });
});

test('the emailed link asks for the password', async ({ page }) => {
  await page.goto(`/signup/complete?token=${TOKEN}`);
  await expect(page.getByRole('heading', { name: 'Choose your password' })).toBeVisible();
  await expect(page.getByText('new@example.dev')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create my account' })).toBeVisible();
});

test('an expired link says so and offers a new sign-up', async ({ page }) => {
  await page.goto(`/signup/complete?token=${'x'.repeat(43)}`);
  await expect(page.getByRole('heading', { name: 'This link has expired' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign up again' }).click();
  await expect(page).toHaveURL(/\/signup$/);
});
