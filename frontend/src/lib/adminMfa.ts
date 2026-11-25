/**
 * The admin panel's second-factor proof (T1.4), issued by the server after a
 * valid authenticator or backup code and sent as X-Admin-MFA (lib/api.ts).
 * Worthless on its own: the server also needs that admin's Firebase sign-in,
 * and it expires with the 12-hour admin session.
 *
 * Kept in memory only (audit P2-8): never in localStorage or sessionStorage,
 * where any script on the page, or anyone with the browser's storage, could
 * read it. The price is that a page refresh or a second tab asks for the
 * code again, which only matters while two-step sign-in is switched on.
 * Cleared on every sign-out.
 */

const LEGACY_KEY = 'bustandeen_admin_mfa';

let proof: string | null = null;

/** Older versions kept the proof in localStorage: remove what they left behind. */
function dropLegacyCopy(): void {
  try {
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* storage blocked: nothing was stored either */
  }
}

dropLegacyCopy();

export function getAdminMfaProof(): string | null {
  return proof;
}

export function setAdminMfaProof(next: string): void {
  proof = next;
}

export function clearAdminMfaProof(): void {
  proof = null;
  dropLegacyCopy();
}
