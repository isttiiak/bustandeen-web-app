import { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  signOut,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  browserPopupRedirectResolver,
  EmailAuthProvider,
  type AuthError,
} from 'firebase/auth';
import { auth, googleProvider } from '../../firebase.js';
import { useDeleteAccount } from '../../hooks/useUserProfile.js';

/** Delete account: the confirm step, the fresh re-authentication, and the purge. */
export function useAccountDeletion() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const deleteAccount = useDeleteAccount();
  const [deleteAccountStep, setDeleteAccountStep] = useState<
    'idle' | 'confirm' | 'reauth' | 'deleting'
  >('idle');
  const [reauthPassword, setReauthPassword] = useState('');
  const [reauthError, setReauthError] = useState<string | null>(null);
  const [reauthBusy, setReauthBusy] = useState(false);
  // When both a password and Google are linked, let the user pick which one
  // to verify with instead of always defaulting to password.
  const [reauthMethod, setReauthMethod] = useState<'password' | 'google'>('password');

  // ── Delete account: full GDPR purge + Firebase auth removal ─────────────
  // Irreversible and full data loss — requires a fresh re-authentication
  // (not just the existing session token) immediately beforehand, so a
  // shared/unlocked device with a live session can't be used to wipe the
  // account. See docs on requireRecentAuth in the backend for the matching
  // server-side check (a stale token gets rejected even if this step is
  // somehow bypassed via a direct API call).
  const hasPasswordProvider = auth.currentUser?.providerData.some(
    (p) => p.providerId === 'password'
  );
  const hasGoogleProvider = auth.currentUser?.providerData.some(
    (p) => p.providerId === 'google.com'
  );
  const canChooseReauthMethod = !!hasPasswordProvider && !!hasGoogleProvider;

  const runDeleteAccount = async () => {
    setDeleteAccountStep('deleting');
    try {
      await deleteAccount.mutateAsync();
      localStorage.removeItem('bustandeen_idToken');
      await signOut(auth);
      // Without this, staying on /settings after sign-out hits the Protected
      // route's "sign in required" gate on the same page instead of landing
      // somewhere sensible for a now-signed-out visitor.
      navigate('/', { replace: true });
    } catch (err) {
      const errorCode = (err as { response?: { data?: { error?: string } } } | null)?.response?.data
        ?.error;
      if (errorCode === 'staff_account') {
        toast.error(
          t(
            'settings.toast.deleteBlockedStaff',
            'This login is also an admin account. Ask the Servant to deactivate it in the admin panel first.'
          )
        );
        setDeleteAccountStep('idle');
      } else if (errorCode === 'reauth_required') {
        toast.error(
          t(
            'settings.toast.reauthRequired',
            'Your sign-in is too old for this. Please verify again.'
          )
        );
        setReauthError(null);
        setDeleteAccountStep('reauth');
      } else {
        toast.error(
          t(
            'settings.toast.deleteAccountFailed',
            'Account deletion failed. Please try again or contact support.'
          )
        );
        setDeleteAccountStep('idle');
      }
    }
  };

  const reauthErrorMessage = (err: unknown): string => {
    const code = (err as AuthError)?.code;
    if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
      return t('settings.reauthWrongPassword', 'Incorrect password. Please try again.');
    }
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      return t('settings.reauthPopupClosed', 'Verification was cancelled.');
    }
    if (code === 'auth/too-many-requests') {
      return t('settings.reauthTooManyRequests', 'Too many attempts. Please wait and try again.');
    }
    return t('settings.reauthFailed', 'Verification failed. Please try again.');
  };

  const reauthWithPassword = async () => {
    if (!auth.currentUser?.email || !reauthPassword) return;
    setReauthBusy(true);
    setReauthError(null);
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, reauthPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      setReauthPassword('');
      await runDeleteAccount();
    } catch (err) {
      setReauthError(reauthErrorMessage(err));
    } finally {
      setReauthBusy(false);
    }
  };

  const reauthWithGoogle = async () => {
    if (!auth.currentUser) return;
    setReauthBusy(true);
    setReauthError(null);
    try {
      await reauthenticateWithPopup(auth.currentUser, googleProvider, browserPopupRedirectResolver);
      await runDeleteAccount();
    } catch (err) {
      setReauthError(reauthErrorMessage(err));
    } finally {
      setReauthBusy(false);
    }
  };

  return {
    deleteAccountStep,
    setDeleteAccountStep,
    reauthPassword,
    setReauthPassword,
    reauthError,
    setReauthError,
    reauthBusy,
    reauthMethod,
    setReauthMethod,
    hasPasswordProvider,
    canChooseReauthMethod,
    reauthWithPassword,
    reauthWithGoogle,
  };
}
