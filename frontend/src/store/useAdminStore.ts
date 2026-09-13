import { create } from 'zustand';

const ADMIN_TOKEN_KEY = 'bustandeen_adminToken';

const readToken = (): string | null => {
  try {
    return sessionStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
};

interface AdminState {
  /** Session token from POST /api/admin/auth/verify-password — required by
   * every /api/admin/* route on top of the Firebase admin-email allowlist.
   * Kept in sessionStorage (not localStorage) so it doesn't outlive the tab —
   * the admin panel re-prompts for the password each new session, on purpose. */
  token: string | null;
  setToken: (token: string | null) => void;
}

export const useAdminStore = create<AdminState>((set) => ({
  token: readToken(),
  setToken: (token) => {
    try {
      if (token) sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
      else sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    } catch {
      /* private-browsing storage block — session just won't persist a reload */
    }
    set({ token });
  },
}));
