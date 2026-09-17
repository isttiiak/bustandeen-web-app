import { create } from 'zustand';

export type AdminRole = 'servant' | 'ansar';
export type AnsarDomain = 'sadaqah' | 'general';

interface AdminState {
  /** 'checking' — Firebase is restoring/verifying the admin-app session on
   *  mount (see AdminGate's onAuthStateChanged listener). 'signedOut' — no
   *  admin Firebase session, show the sign-in form (also the state right
   *  after a Firebase identity was rejected — AdminGate signs it back out of
   *  the admin Firebase app rather than leaving a "logged in but not
   *  authorized" session hanging around, and shows its own local error
   *  banner alongside the form instead of storing that here). 'ready' — a
   *  Firebase session exists AND the backend confirmed it's an active
   *  AdminAccount; email/role are populated. */
  status: 'checking' | 'signedOut' | 'ready';
  email: string | null;
  role: AdminRole | null;
  setSignedOut: () => void;
  setSession: (email: string, role: AdminRole) => void;
}

export const useAdminStore = create<AdminState>((set) => ({
  status: 'checking',
  email: null,
  role: null,
  setSignedOut: () => set({ status: 'signedOut', email: null, role: null }),
  setSession: (email, role) => set({ status: 'ready', email, role }),
}));
