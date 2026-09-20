import { initializeApp } from 'firebase/app';
import { getAuth, browserLocalPersistence, setPersistence } from 'firebase/auth';

/**
 * A SECOND, named Firebase app instance — same project as the main app's
 * firebase.ts, but its own isolated auth state. This is what actually fixes
 * the "Home button leaks into the other admin's account" bug: previously the
 * admin panel had its own login but shared the page with the main app's
 * Navbar, which reads whichever regular Firebase user happens to be cached
 * in this browser (see App.tsx's isAdminPage gating) — completely unrelated
 * to who is signed into the admin panel. Firebase namespaces persisted auth
 * state by app name, so signing into the admin panel here can never affect,
 * or be affected by, the main app's `auth.currentUser` (firebase.ts), even
 * in the same tab.
 *
 * Local (not session-only) persistence deliberately: a Servant/Ansar
 * reasonably expects to open the admin panel in a new tab, or reload, without
 * re-entering a password every time — the isolation above is what actually
 * keeps this separate from a regular account, not how long the session lives.
 * The session still ends on an explicit Log out (useAdminLogout), same as
 * the main app.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
};

const adminApp = initializeApp(firebaseConfig, 'admin');
export const adminAuth = getAuth(adminApp);

void setPersistence(adminAuth, browserLocalPersistence);
