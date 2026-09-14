import { isAdminEmail } from '../src/middleware/auth.js';

describe('isAdminEmail', () => {
  const original = process.env.ADMIN_EMAILS;
  afterEach(() => {
    process.env.ADMIN_EMAILS = original;
  });

  test('is case-insensitive and reads a comma-separated list', () => {
    process.env.ADMIN_EMAILS = 'Istiak@bustandeen.com, ansar@bustandeen.com';
    expect(isAdminEmail('istiak@bustandeen.com')).toBe(true);
    expect(isAdminEmail('ANSAR@bustandeen.com')).toBe(true);
    expect(isAdminEmail('someone-else@test.dev')).toBe(false);
  });

  test('is false for empty/undefined input', () => {
    expect(isAdminEmail(undefined)).toBe(false);
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail('')).toBe(false);
  });
});
