import {
  browserPopupRedirectResolver,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  type Auth,
  type AuthProvider,
} from 'firebase/auth';
import type { AuthUser } from '../types/api.js';

// Google sign-in for the website and the installed app (PWA).
//
// A popup works in a browser tab, but in an installed app (iOS especially)
// it opens in a separate browser sheet that cannot hand the result back, so
// sign-in hangs. There a full-page redirect is used instead. A redirect only
// survives the browsers' storage partitioning when the auth helper pages are
// served from our own origin: vercel.json proxies /__/auth/* to Firebase,
// and VITE_FIREBASE_AUTH_DOMAIN must be bustandeen.com. Until that variable
// is switched, authDomain is still the firebaseapp.com host and the popup is
// kept everywhere (no change in behaviour).

/** The app was launched from the home screen (Android, desktop, or iOS). */
export function isStandaloneDisplay(): boolean {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || !!window.matchMedia?.('(display-mode: standalone)').matches;
}

export function shouldUseRedirect(
  authDomain: string | undefined,
  host: string,
  standalone: boolean
): boolean {
  return standalone && !!authDomain && authDomain === host;
}

function redirectMode(auth: Auth): boolean {
  return shouldUseRedirect(auth.config.authDomain, window.location.host, isStandaloneDisplay());
}

// Set just before leaving for Google, so the sign-in page that loads on the
// way back can show "Signing you in" instead of the form while the result is
// read. Session storage: it belongs to this tab only.
const REDIRECT_PENDING_KEY = 'bustandeen_google_redirect';

function readPending(): boolean {
  try {
    return sessionStorage.getItem(REDIRECT_PENDING_KEY) === '1';
  } catch {
    return false;
  }
}

function setPending(on: boolean): void {
  try {
    if (on) sessionStorage.setItem(REDIRECT_PENDING_KEY, '1');
    else sessionStorage.removeItem(REDIRECT_PENDING_KEY);
  } catch {
    /* storage blocked: the page just shows the form while it finishes */
  }
}

/** This page load is the way back from a Google redirect sign-in. */
export function hasPendingGoogleRedirect(): boolean {
  return readPending();
}

/** Popup in a tab; redirect in the installed app (once authDomain is ours). */
export async function signInWithGoogle(auth: Auth, provider: AuthProvider): Promise<void> {
  if (redirectMode(auth)) {
    setPending(true);
    await signInWithRedirect(auth, provider, browserPopupRedirectResolver);
    return;
  }
  await signInWithPopup(auth, provider, browserPopupRedirectResolver);
}

export interface RedirectOutcome {
  /** A Firebase error code (e.g. account-exists-with-different-credential). */
  error: string | null;
  /** The redirect signed someone in; they arrive through onAuthStateChanged. */
  signedIn: boolean;
}

/** Finish a redirect sign-in when the app comes back to the sign-in page. */
export async function completeGoogleRedirect(auth: Auth): Promise<RedirectOutcome> {
  if (!redirectMode(auth)) {
    setPending(false);
    return { error: null, signedIn: false };
  }
  try {
    const result = await getRedirectResult(auth, browserPopupRedirectResolver);
    return { error: null, signedIn: !!result };
  } catch (err) {
    return { error: (err as { code?: string }).code ?? 'auth/internal-error', signedIn: false };
  } finally {
    setPending(false);
  }
}

/**
 * The sign-in page shows "Signing you in" instead of its form once a sign-in
 * has succeeded (or is being read back after a redirect), until App.tsx moves
 * on. An unverified email account stays: sign-up shows its verify screen.
 */
export function shouldShowSigningIn(finishing: boolean, user: AuthUser | null): boolean {
  if (user) return user.emailVerified !== false;
  return finishing;
}
