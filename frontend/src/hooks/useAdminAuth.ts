import { useMutation } from '@tanstack/react-query';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from 'firebase/auth';
import api from '../lib/api.js';
import { adminAuth } from '../adminFirebase.js';
import { useAdminStore } from '../store/useAdminStore.js';
import { clearAdminMfaProof, setAdminMfaProof } from '../lib/adminMfa.js';

/**
 * Real Firebase sign-in against the SECOND, isolated admin Firebase app
 * (adminFirebase.ts) — completely separate from the main app's own
 * sign-in/account. This only proves identity (wrong password surfaces here
 * immediately); AdminGate's onAuthStateChanged listener does the follow-up
 * confirmation against the backend's AdminAccount collection and signs back
 * out if that identity isn't a registered, active admin.
 */
export function useAdminLogin() {
  return useMutation({
    mutationFn: (creds: { email: string; password: string }) =>
      signInWithEmailAndPassword(adminAuth, creds.email, creds.password),
  });
}

export function useAdminLogout() {
  const setSignedOut = useAdminStore((s) => s.setSignedOut);
  return useMutation({
    mutationFn: () => signOut(adminAuth),
    onSuccess: () => {
      clearAdminMfaProof();
      setSignedOut();
    },
  });
}

/**
 * Changes the signed-in admin's own password: confirms the current one,
 * sets the new one, then tells the server so every other sign-in of this
 * admin stops working (this one stays).
 */
export function useChangeAdminPassword() {
  return useMutation({
    mutationFn: async ({ current, next }: { current: string; next: string }) => {
      const user = adminAuth.currentUser;
      if (!user?.email) throw new Error('not_signed_in');
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, current));
      await updatePassword(user, next);
      await user.getIdToken(true);
      // Ending the other sessions also ended this one's MFA proof; the
      // server hands back a fresh one.
      const res = await api.post<{ mfaProof?: string }>('/api/admin/auth/password-changed');
      if (res.data.mfaProof) setAdminMfaProof(res.data.mfaProof);
    },
  });
}

// ── Second factor (T1.4) ─────────────────────────────────────────────────────

/** Sign-in step: a 6-digit authenticator code or a backup code. */
export function useAdminMfaVerify() {
  return useMutation({
    mutationFn: (code: string) =>
      api
        .post<{
          mfaProof: string;
          usedBackupCode: boolean;
          backupCodesLeft: number;
        }>('/api/admin/auth/mfa/verify', { code })
        .then((r) => r.data),
    onSuccess: (data) => setAdminMfaProof(data.mfaProof),
  });
}

/** Enrolment step 1: a new secret for the authenticator app. */
export function useAdminMfaEnrolStart() {
  return useMutation({
    mutationFn: () =>
      api
        .post<{ secret: string; otpauthUri: string }>('/api/admin/auth/mfa/enroll/start')
        .then((r) => r.data),
  });
}

/** Enrolment step 2: the first code turns it on and returns the backup codes. */
export function useAdminMfaEnrolConfirm() {
  return useMutation({
    mutationFn: (code: string) =>
      api
        .post<{
          mfaProof: string;
          backupCodes: string[];
        }>('/api/admin/auth/mfa/enroll/confirm', { code })
        .then((r) => r.data),
    onSuccess: (data) => setAdminMfaProof(data.mfaProof),
  });
}
