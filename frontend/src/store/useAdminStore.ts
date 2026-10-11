import { create } from 'zustand';

export type AdminRole = 'servant' | 'ansar';
export type AnsarDomain = 'sadaqah' | 'general';
/** Second factor (T1.4): 'verify' = enter a code, 'enroll' = set one up. */
export type AdminMfaStep = 'verify' | 'enroll';

interface AdminState {
  /** 'checking' — Firebase is restoring/verifying the admin-app session on
   *  mount (see AdminGate's onAuthStateChanged listener). 'signedOut' — no
   *  admin Firebase session, show the sign-in form (also the state right
   *  after a Firebase identity was rejected — AdminGate signs it back out of
   *  the admin Firebase app rather than leaving a "logged in but not
   *  authorized" session hanging around, and shows its own local error
   *  banner alongside the form instead of storing that here). 'mfa' — the
   *  password sign-in is a registered admin, but the second factor is still
   *  missing (mfaStep says which screen). 'ready' — a Firebase session exists
   *  AND the backend confirmed it's an active AdminAccount with a passed
   *  second factor; email/role/ansarDomain are populated. */
  status: 'checking' | 'signedOut' | 'mfa' | 'ready';
  email: string | null;
  role: AdminRole | null;
  ansarDomain: AnsarDomain | null;
  mfaStep: AdminMfaStep | null;
  setSignedOut: () => void;
  setSession: (
    email: string,
    role: AdminRole,
    ansarDomain: AnsarDomain | null,
    mfa?: 'ok' | AdminMfaStep
  ) => void;
  /** A request came back 403 mfa_required: ask for the second factor again. */
  setMfaRequired: (step: AdminMfaStep) => void;
  /** The second factor passed (the proof is already stored). */
  setMfaPassed: () => void;
}

export const useAdminStore = create<AdminState>((set) => ({
  status: 'checking',
  email: null,
  role: null,
  ansarDomain: null,
  mfaStep: null,
  setSignedOut: () =>
    set({ status: 'signedOut', email: null, role: null, ansarDomain: null, mfaStep: null }),
  setSession: (email, role, ansarDomain, mfa = 'ok') =>
    set({
      status: mfa === 'ok' ? 'ready' : 'mfa',
      email,
      role,
      ansarDomain,
      mfaStep: mfa === 'ok' ? null : mfa,
    }),
  setMfaRequired: (step) =>
    set((s) => (s.status === 'signedOut' ? s : { status: 'mfa', mfaStep: step })),
  setMfaPassed: () => set({ status: 'ready', mfaStep: null }),
}));
