import { create } from 'zustand';

const ADMIN_TOKEN_KEY = 'bustandeen_adminToken';
const ADMIN_EMAIL_KEY = 'bustandeen_adminEmail';
const ADMIN_OWNER_KEY = 'bustandeen_adminIsOwner';

const readString = (key: string): string | null => {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

interface AdminState {
  /** Session token from POST /api/admin/auth/login — required by every
   * /api/admin/* route. This IS the admin panel's entire authentication;
   * no Firebase account is involved at any point. Kept in sessionStorage
   * (not localStorage) so it doesn't outlive the tab — logging into the
   * admin panel is a deliberate, per-session action. */
  token: string | null;
  /** The admin email that logged in — shown in the UI and used to decide
   * whether to render owner-only controls (a UX nicety only; the real
   * enforcement is server-side via requireOwnerAdmin). */
  email: string | null;
  isOwner: boolean;
  login: (token: string, email: string, isOwner: boolean) => void;
  logout: () => void;
}

export const useAdminStore = create<AdminState>((set) => ({
  token: readString(ADMIN_TOKEN_KEY),
  email: readString(ADMIN_EMAIL_KEY),
  isOwner: readString(ADMIN_OWNER_KEY) === '1',
  login: (token, email, isOwner) => {
    try {
      sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
      sessionStorage.setItem(ADMIN_EMAIL_KEY, email);
      sessionStorage.setItem(ADMIN_OWNER_KEY, isOwner ? '1' : '0');
    } catch {
      /* private-browsing storage block — session just won't persist a reload */
    }
    set({ token, email, isOwner });
  },
  logout: () => {
    try {
      sessionStorage.removeItem(ADMIN_TOKEN_KEY);
      sessionStorage.removeItem(ADMIN_EMAIL_KEY);
      sessionStorage.removeItem(ADMIN_OWNER_KEY);
    } catch {
      /* ignore */
    }
    set({ token: null, email: null, isOwner: false });
  },
}));
