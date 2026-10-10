import { jest } from '@jest/globals';
import { linkFirebaseUser } from '../src/services/adminAccount.service.js';

const notFound = () => Object.assign(new Error('no user'), { code: 'auth/user-not-found' });

const fakeAuth = (existing) => ({
  getUserByEmail: jest.fn(async () => {
    if (!existing) throw notFound();
    return existing;
  }),
  createUser: jest.fn(async () => ({ uid: 'new-uid' })),
  updateUser: jest.fn(async () => ({})),
  revokeRefreshTokens: jest.fn(async () => {}),
});

describe('linkFirebaseUser (U8.1)', () => {
  test('creates a verified account when the email has none', async () => {
    const auth = fakeAuth(null);
    const out = await linkFirebaseUser(auth, { email: 'a@test.dev', password: 'strongpass1' });
    expect(out).toEqual({ uid: 'new-uid', link: 'created' });
    expect(auth.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'a@test.dev', password: 'strongpass1', emailVerified: true })
    );
  });

  test('links a verified account as is, keeping its password', async () => {
    const auth = fakeAuth({ uid: 'owner-uid', emailVerified: true });
    const out = await linkFirebaseUser(auth, { email: 'a@test.dev', password: 'strongpass1' });
    expect(out).toEqual({ uid: 'owner-uid', link: 'linked' });
    expect(auth.updateUser).not.toHaveBeenCalled();
    expect(auth.revokeRefreshTokens).not.toHaveBeenCalled();
  });

  test('reclaims an unverified account: new password, verified, sessions revoked', async () => {
    const auth = fakeAuth({ uid: 'squatter-uid', emailVerified: false });
    const out = await linkFirebaseUser(auth, { email: 'a@test.dev', password: 'strongpass1' });
    expect(out).toEqual({ uid: 'squatter-uid', link: 'reclaimed' });
    expect(auth.updateUser).toHaveBeenCalledWith('squatter-uid', {
      password: 'strongpass1',
      emailVerified: true,
    });
    expect(auth.revokeRefreshTokens).toHaveBeenCalledWith('squatter-uid');
  });

  test('refuses an unverified account when no password was given (bootstrap)', async () => {
    const auth = fakeAuth({ uid: 'squatter-uid', emailVerified: false });
    await expect(linkFirebaseUser(auth, { email: 'a@test.dev' })).rejects.toMatchObject({
      status: 409,
    });
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  test('never treats a lookup failure as "no account"', async () => {
    const auth = fakeAuth(null);
    auth.getUserByEmail.mockRejectedValueOnce(
      Object.assign(new Error('x'), { code: 'auth/internal-error' })
    );
    await expect(
      linkFirebaseUser(auth, { email: 'a@test.dev', password: 'strongpass1' })
    ).rejects.toThrow('x');
    expect(auth.createUser).not.toHaveBeenCalled();
  });
});
