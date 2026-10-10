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
