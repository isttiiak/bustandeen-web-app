import {
  browserPopupRedirectResolver,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  type Auth,
  type AuthProvider,
} from 'firebase/auth';

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

/** Popup in a tab; redirect in the installed app (once authDomain is ours). */
export async function signInWithGoogle(auth: Auth, provider: AuthProvider): Promise<void> {
  if (redirectMode(auth)) {
    await signInWithRedirect(auth, provider, browserPopupRedirectResolver);
    return;
  }
  await signInWithPopup(auth, provider, browserPopupRedirectResolver);
}

/**
 * Finish a redirect sign-in when the app comes back to the sign-in page. The
 * signed-in user then arrives through onAuthStateChanged as usual; this only
 * surfaces an error (e.g. account-exists-with-different-credential).
 * Resolves to the Firebase error code, or null.
 */
export async function completeGoogleRedirect(auth: Auth): Promise<string | null> {
  if (!redirectMode(auth)) return null;
  try {
    await getRedirectResult(auth, browserPopupRedirectResolver);
    return null;
  } catch (err) {
    return (err as { code?: string }).code ?? 'auth/internal-error';
  }
}
