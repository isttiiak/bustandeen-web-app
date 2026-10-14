// v5.163.0: the admin panel moved to admin.bustandeen.com. An admin who used
// it on bustandeen.com still has that sign-in stored here (the 'admin'
// Firebase app's saved user, with its refresh token, and the second-factor
// proof). Nothing on this site reads them any more, so they are removed once:
// an old sign-in left in the app's storage is exactly what origin isolation is
// meant to keep away from the app. Only on the production host: previews and
// local dev serve the panel on the same host as the app.

const DONE = 'bustandeen_admin_moved';
const FIREBASE_DB = 'firebaseLocalStorageDb';
const FIREBASE_STORE = 'firebaseLocalStorage';

export function retireAdminSession(
  apiKey: string | undefined,
  host = window.location.hostname
): void {
  if (host !== 'bustandeen.com' || !apiKey) return;
  try {
    if (localStorage.getItem(DONE)) return;
    const key = `firebase:authUser:${apiKey}:admin`;
    localStorage.removeItem(key);
    localStorage.removeItem('bustandeen_admin_mfa');
    void removeFromFirebaseDb(key);
    localStorage.setItem(DONE, '1');
  } catch {
    /* storage blocked: nothing was stored either */
  }
}

/** Firebase may also keep a saved user in IndexedDB. Opened only if the
 *  database already exists: opening a missing one would create it without
 *  Firebase's store and break the app's own sign-in. */
async function removeFromFirebaseDb(key: string): Promise<void> {
  if (typeof indexedDB === 'undefined' || typeof indexedDB.databases !== 'function') return;
  const dbs = await indexedDB.databases();
  if (!dbs.some((d) => d.name === FIREBASE_DB)) return;
  await new Promise<void>((resolve) => {
    const open = indexedDB.open(FIREBASE_DB);
    open.onerror = () => resolve();
    open.onsuccess = () => {
      const db = open.result;
      if (!db.objectStoreNames.contains(FIREBASE_STORE)) {
        db.close();
        resolve();
        return;
      }
      const tx = db.transaction(FIREBASE_STORE, 'readwrite');
      tx.objectStore(FIREBASE_STORE).delete(key);
      tx.oncomplete =
        tx.onerror =
        tx.onabort =
          () => {
            db.close();
            resolve();
          };
    };
  });
}
