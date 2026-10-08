import { useEffect, useRef, useState } from 'react';
import type { AuthError } from 'firebase/auth';
import { auth, googleProvider } from '../firebase.js';
import { useAuthStore } from '../store/useAuthStore.js';
import {
  completeGoogleRedirect,
  hasPendingGoogleRedirect,
  shouldShowSigningIn,
  signInWithGoogle,
} from './googleSignIn.js';

/** "Signing you in" never stays up longer than this, whatever happens. */
export const FINISH_TIMEOUT_MS = 20_000;
/** After the Google popup closes, how long a sign-in may take to arrive
 *  before the buttons are given back (the popup was most likely cancelled). */
export const POPUP_RETURN_GRACE_MS = 2_500;

const CANCELLED = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request']);

/**
 * Shared state for the sign-in and sign-up pages:
 * - back from a Google redirect (installed app): "Signing you in" at once,
 *   not the form, while the result is read;
 * - popup or password success: "Signing you in" until the page changes;
 * - popup closed without signing in: Firebase notices only by polling (up to
 *   ~10 s), so the buttons spun on. Once the window has its focus back and no
 *   user arrived within POPUP_RETURN_GRACE_MS, they are reset.
 */
export function useSignInFlow(onError: (code: string) => void) {
  // A demo visitor reaches /login still "signed in" as the demo user: not a sign-in.
  const user = useAuthStore((s) => (s.isDemoMode ? null : s.user));
  const [loading, setLoading] = useState(false);
  const [finishing, setFinishing] = useState(hasPendingGoogleRedirect);
  const popupOpen = useRef(false);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    let alive = true;
    void completeGoogleRedirect(auth).then(({ error, signedIn }) => {
      if (!alive) return;
      if (error) onErrorRef.current(error);
      if (!signedIn) setFinishing(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!finishing) return;
    const id = setTimeout(() => {
      setFinishing(false);
      setLoading(false);
    }, FINISH_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [finishing]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onFocus = () => {
      if (!popupOpen.current) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (popupOpen.current && !useAuthStore.getState().user) {
          popupOpen.current = false;
          setLoading(false);
        }
      }, POPUP_RETURN_GRACE_MS);
    };
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      clearTimeout(timer);
    };
  }, []);

  const google = async () => {
    setLoading(true);
    popupOpen.current = true;
    try {
      await signInWithGoogle(auth, googleProvider);
      setFinishing(true);
    } catch (err) {
      const code = (err as AuthError).code ?? '';
      if (!CANCELLED.has(code)) onErrorRef.current(code);
      setLoading(false);
    } finally {
      popupOpen.current = false;
    }
  };

  return {
    loading,
    setLoading,
    setFinishing,
    google,
    signingIn: shouldShowSigningIn(finishing, user),
  };
}
