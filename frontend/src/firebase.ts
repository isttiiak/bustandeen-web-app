import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  browserSessionPersistence,
  GoogleAuthProvider,
  indexedDBLocalPersistence,
  initializeAuth,
} from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { markFirebaseLoaded } from './authClient.js';

// Loaded on demand through authClient.ts (never import this from a module the
// app loads up front); these re-exports let callers use one dynamic import.
export { onAuthStateChanged, sendEmailVerification, signOut } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
};

const app = initializeApp(firebaseConfig);
// initializeAuth with getAuth()'s own persistences (same order, so existing
// sessions keep working), minus the popup/redirect resolver: with it, Firebase
// loads Google's sign-in iframe (~135 KB of scripts from apis.google.com and
// firebaseapp.com) on every page view (audit PERF-01). The Google sign-in
// buttons pass browserPopupRedirectResolver to signInWithPopup themselves.
export const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence],
});
export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({ prompt: 'select_account' });

export const storage = getStorage(app);

markFirebaseLoaded();
