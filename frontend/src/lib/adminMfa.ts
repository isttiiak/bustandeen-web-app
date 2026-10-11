/**
 * The admin panel's second-factor proof (T1.4), issued by the server after a
 * valid authenticator or backup code and sent as X-Admin-MFA (lib/api.ts).
 * Worthless on its own: the server also needs that admin's Firebase sign-in,
 * and it expires with the 12-hour admin session. Kept in localStorage so a
 * second admin tab does not ask for a code again; cleared on every sign-out.
 */

const KEY = 'bustandeen_admin_mfa';

export function getAdminMfaProof(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setAdminMfaProof(proof: string): void {
  try {
    localStorage.setItem(KEY, proof);
  } catch {
    /* private mode: the code is asked again on the next page load */
  }
}

export function clearAdminMfaProof(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing stored */
  }
}
