import { create } from 'zustand';

/**
 * The admin panel's "enter your password again" prompt. The server asks for
 * it (`admin_reauth_required`) before an irreversible Servant action when the
 * last password entry is more than a few minutes old; lib/api.ts calls
 * `request()`, AdminReauthDialog shows the prompt and settles it, and the API
 * client repeats the original request when it resolves true.
 */
interface AdminReauthState {
  open: boolean;
  resolve: ((ok: boolean) => void) | null;
  /** Opens the prompt (or joins one already open) and waits for its outcome. */
  request: () => Promise<boolean>;
  /** Called by the dialog: true after a successful re-auth, false on cancel. */
  settle: (ok: boolean) => void;
}

export const useAdminReauthStore = create<AdminReauthState>((set, get) => ({
  open: false,
  resolve: null,
  request: () =>
    new Promise<boolean>((resolve) => {
      const previous = get().resolve;
      set({
        open: true,
        resolve: (ok) => {
          previous?.(ok);
          resolve(ok);
        },
      });
    }),
  settle: (ok) => {
    const { resolve } = get();
    set({ open: false, resolve: null });
    resolve?.(ok);
  },
}));
