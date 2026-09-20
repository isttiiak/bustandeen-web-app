import { useMutation } from '@tanstack/react-query';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
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
