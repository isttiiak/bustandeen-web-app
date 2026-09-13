import { signAdminSessionToken, isOwnerAdmin } from '../src/middleware/auth.js';

describe('Admin session token — the secret-mismatch regression', () => {
  const original = process.env.ADMIN_SESSION_SECRET;
  afterEach(() => {
    process.env.ADMIN_SESSION_SECRET = original;
  });

  test('signing throws when ADMIN_SESSION_SECRET is unset, instead of silently issuing a token nothing can verify', () => {
    delete process.env.ADMIN_SESSION_SECRET;
    expect(() => signAdminSessionToken('admin@test.dev')).toThrow();
  });

  test('signing succeeds and marks isOwner correctly once the secret is set', () => {
    process.env.ADMIN_SESSION_SECRET = 'a-real-secret';
    process.env.ADMIN_OWNER_EMAILS = 'owner@test.dev';
    const owner = signAdminSessionToken('owner@test.dev');
    expect(owner.token).toBeTruthy();
    expect(owner.isOwner).toBe(true);

    const staff = signAdminSessionToken('staff@test.dev');
    expect(staff.isOwner).toBe(false);
  });
});

describe('isOwnerAdmin', () => {
  const original = process.env.ADMIN_OWNER_EMAILS;
  afterEach(() => {
    process.env.ADMIN_OWNER_EMAILS = original;
  });

  test('is case-insensitive and reads a comma-separated list', () => {
    process.env.ADMIN_OWNER_EMAILS = 'Istiak@bustandeen.com, ansar@bustandeen.com';
    expect(isOwnerAdmin('istiak@bustandeen.com')).toBe(true);
    expect(isOwnerAdmin('ANSAR@bustandeen.com')).toBe(true);
    expect(isOwnerAdmin('someone-else@test.dev')).toBe(false);
  });
});
