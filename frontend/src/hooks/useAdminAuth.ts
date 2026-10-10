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
    onSuccess: () => setSignedOut(),
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
      await api.post('/api/admin/auth/password-changed');
    },
  });
}
