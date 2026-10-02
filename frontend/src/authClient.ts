// Firebase (about 100 KB of compressed JavaScript) loads only when it is
// needed (PERF-01 follow-up): at once for anyone who has signed in on this
// device, and otherwise when a page that signs in imports firebase.ts (sign
// in, sign up, the email action page). A visitor who never signs in never
// downloads it. Kept free of static Firebase imports on purpose.

import type { Auth } from 'firebase/auth';

type FirebaseModule = typeof import('./firebase.js');

/** Set while an account is signed in on this device (App.tsx); removed on a
 * genuine sign-out. The token and cached user are fallbacks for sessions from
 * before this key existed. */
export const SESSION_MARKER = 'bustandeen_has_session';
const SESSION_KEYS = [SESSION_MARKER, 'bustandeen_idToken', 'bustandeen_user'];

export function hasSessionHint(): boolean {
  try {
    return SESSION_KEYS.some((k) => localStorage.getItem(k) !== null);
  } catch {
    // Storage blocked: we can't tell, so load Firebase and let it decide.
    return true;
  }
}

let loading: Promise<FirebaseModule> | null = null;
let loaded: FirebaseModule | null = null;
const waiters: Array<(m: FirebaseModule) => void> = [];

/** Loads firebase.ts (once) and resolves with it. */
export function loadFirebase(): Promise<FirebaseModule> {
  if (!loading) {
    loading = import('./firebase.js').then((m) => {
      loaded = m;
      waiters.splice(0).forEach((cb) => cb(m));
      return m;
    });
  }
  return loading;
}

/** Called by firebase.ts when it is evaluated, however it was imported. */
export function markFirebaseLoaded(): void {
  void loadFirebase();
}

/** Runs `cb` once Firebase is loaded: now, or whenever something loads it. */
export function whenFirebaseLoaded(cb: (m: FirebaseModule) => void): void {
  if (loaded) cb(loaded);
  else if (loading) void loading.then(cb);
  else waiters.push(cb);
}

/** firebase.ts if it has loaded already, without loading it. */
export function loadedFirebase(): FirebaseModule | null {
  return loaded;
}

// The admin panel's own Firebase app (adminFirebase.ts) loads with AdminGate,
// i.e. only on /admin pages; api.ts reads its token through this.
let adminAuth: Auth | null = null;

export function markAdminAuthLoaded(auth: Auth): void {
  adminAuth = auth;
}

export function loadedAdminAuth(): Auth | null {
  return adminAuth;
}
