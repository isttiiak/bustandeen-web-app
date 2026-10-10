import { create } from 'zustand';
import { AuthUser } from '../types/api.js';
import { getDemoUser } from '../utils/demoData.js';
import {
  clearDemoSession,
  readDemoSession,
  restoreDeviceSettings,
  snapshotDeviceSettings,
  writeDemoSession,
} from '../utils/demoSession.js';

interface AuthState {
  user: AuthUser | null;
  aiEnabled: boolean;
  redirectPath: string;
  authLoading: boolean;
  isDemoMode: boolean;
  setUser: (user: AuthUser | null) => void;
  setRedirectPath: (path: string) => void;
  setAiEnabled: (aiEnabled: boolean) => void;
  setAuthLoading: (authLoading: boolean) => void;
  enterDemoMode: (gender: string) => void;
  exitDemoMode: () => void;
  init: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  aiEnabled: false,
  redirectPath: '/',
  // Starts true; overridden synchronously by the self-init call below so
  // returning users with a cached session never see the "Preparing…" spinner.
  authLoading: true,
  isDemoMode: false,

  setUser: (user) => set({ user }),

  setRedirectPath: (path) => set({ redirectPath: path || '/' }),

  setAiEnabled: (aiEnabled) => {
    localStorage.setItem('bustandeen_ai_enabled', aiEnabled ? '1' : '0');
    set({ aiEnabled });
  },

  setAuthLoading: (authLoading) => set({ authLoading }),

  enterDemoMode: (gender: string) => {
    // Kept for this tab (utils/demoSession.ts), so a refresh stays in the demo;
    // the device's settings are copied first and come back when it ends.
    snapshotDeviceSettings();
    writeDemoSession(gender === 'female' ? 'female' : 'male');
    set({ user: getDemoUser(gender), isDemoMode: true, authLoading: false });
  },

  exitDemoMode: () => {
    clearDemoSession();
    restoreDeviceSettings();
    set({ user: null, isDemoMode: false });
  },

  init: () => {
    const ai = localStorage.getItem('bustandeen_ai_enabled');

    let cachedUser: AuthUser | null = null;
    try {
      cachedUser = JSON.parse(localStorage.getItem('bustandeen_user') ?? 'null') as AuthUser | null;
    } catch {
      // cachedUser already defaults to null
    }
    const hasToken = !!localStorage.getItem('bustandeen_idToken');
    const demo = readDemoSession();
    if (cachedUser?.uid) {
      // A real session always wins over a demo left in this tab.
      if (demo) {
        clearDemoSession();
        restoreDeviceSettings();
      }
      set({ aiEnabled: ai === '1', user: cachedUser, authLoading: false });
    } else if (demo && !hasToken) {
      // A refresh (or full page load) during the demo: carry on with it.
      set({ aiEnabled: ai === '1', user: getDemoUser(demo), isDemoMode: true, authLoading: false });
    } else {
      // No cached session — if there is also no token on disk, the user is
      // definitely signed out: show the landing immediately instead of flashing
      // a black spinner screen while Firebase confirms.
      set({ aiEnabled: ai === '1', ...(!hasToken && { authLoading: false }) });
    }
  },
}));

// Self-initialize synchronously at module load time — this runs before ANY
// React component renders, so returning users with a cached session start with
// authLoading=false and the correct user already set. The effect-based init()
// call in App.tsx is idempotent and kept for correctness but is now a no-op
// for the common case.
useAuthStore.getState().init();
