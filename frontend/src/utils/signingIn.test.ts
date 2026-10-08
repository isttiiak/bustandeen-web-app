import { describe, expect, it } from 'vitest';
import { shouldShowSigningIn } from './googleSignIn.js';

const user = (emailVerified: boolean) => ({
  uid: 'u1',
  email: 'a@b.co',
  displayName: null,
  photoUrl: null,
  emailVerified,
});

describe('shouldShowSigningIn', () => {
  it('shows the form when nobody is signing in', () => {
    expect(shouldShowSigningIn(false, null)).toBe(false);
  });

  it('covers the form while a sign-in finishes, before the user arrives', () => {
    expect(shouldShowSigningIn(true, null)).toBe(true);
  });

  it('covers the form once a verified user is in, until the page changes', () => {
    expect(shouldShowSigningIn(false, user(true))).toBe(true);
  });

  it('never covers the verify-your-email step of an unverified account', () => {
    expect(shouldShowSigningIn(true, user(false))).toBe(false);
  });
});
