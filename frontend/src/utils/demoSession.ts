// Demo mode for this tab only (U9): sessionStorage keeps it through a refresh
// or a full page load, and it is gone when the tab closes. index.html's
// inline script reads the same key to skip the prerendered landing.
export const DEMO_SESSION_KEY = 'bustandeen_demo';

export type DemoGender = 'male' | 'female';

export function readDemoSession(): DemoGender | null {
  try {
    const v = sessionStorage.getItem(DEMO_SESSION_KEY);
    return v === 'male' || v === 'female' ? v : null;
  } catch {
    return null;
  }
}

export function writeDemoSession(gender: DemoGender): void {
  try {
    sessionStorage.setItem(DEMO_SESSION_KEY, gender);
  } catch {
    /* storage blocked: the demo lasts until the next page load */
  }
}

export function clearDemoSession(): void {
  try {
    sessionStorage.removeItem(DEMO_SESSION_KEY);
  } catch {
    /* nothing stored */
  }
}

// Settings changed in the demo (theme, language, Home layout, the setup
// card...) are the visitor's to try, not to keep: the device's own settings
// are copied when the demo starts and put back when it ends, or on the next
// visit after the tab was closed during the demo.
export const DEMO_RESTORE_KEY = 'bustandeen_demo_restore';

/** Sign-in state is never rolled back: a real session that started meanwhile
 * (another tab) must survive the restore. */
const NEVER_RESTORED = new Set([
  DEMO_RESTORE_KEY,
  'bustandeen_user',
  'bustandeen_idToken',
  'bustandeen_has_session',
]);

/** Copies the device's settings, once per demo (re-entering keeps the first copy). */
export function snapshotDeviceSettings(): void {
  try {
    if (localStorage.getItem(DEMO_RESTORE_KEY) !== null) return;
    const all: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k !== null && !NEVER_RESTORED.has(k)) all[k] = localStorage.getItem(k) ?? '';
    }
    localStorage.setItem(DEMO_RESTORE_KEY, JSON.stringify(all));
  } catch {
    /* storage blocked or full: demo changes stay on the device */
  }
}

/** Puts the copied settings back: keys the demo added go, changed ones return. */
export function restoreDeviceSettings(): void {
  try {
    const raw = localStorage.getItem(DEMO_RESTORE_KEY);
    if (raw === null) return;
    localStorage.removeItem(DEMO_RESTORE_KEY);
    const saved = JSON.parse(raw) as Record<string, string>;
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k !== null) keys.push(k);
    }
    for (const k of keys) {
      if (!NEVER_RESTORED.has(k) && !(k in saved)) localStorage.removeItem(k);
    }
    for (const [k, v] of Object.entries(saved)) localStorage.setItem(k, v);
  } catch {
    /* a broken copy: leave the device as it is */
  }
}

/** At start-up: a demo whose tab was closed leaves its copy behind; put the
 * settings back before any store reads them. Not while the demo is still on
 * in this tab (a refresh). */
export function restoreAfterClosedDemo(): void {
  if (readDemoSession()) return;
  restoreDeviceSettings();
}
