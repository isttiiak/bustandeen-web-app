import { describe, expect, it } from 'vitest';

// firebase.ts builds Auth with initializeAuth and no popupRedirectResolver
// (audit PERF-01), so every popup or redirect call must pass
// browserPopupRedirectResolver itself, or Firebase throws auth/argument-error
// (Google sign-in, linking Google in Profile, re-auth before deleting the
// account in Settings).
const sources = import.meta.glob<string>(['./**/*.{ts,tsx}', '!./**/*.test.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
});

const CALL =
  /\b(signInWithPopup|linkWithPopup|reauthenticateWithPopup|signInWithRedirect|linkWithRedirect|reauthenticateWithRedirect|getRedirectResult)\(([^)]*)\)/g;

describe('Firebase popup and redirect calls', () => {
  it('scans the app sources', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(50);
  });

  it('always pass browserPopupRedirectResolver', () => {
    const missing: string[] = [];
    let calls = 0;
    for (const [file, src] of Object.entries(sources)) {
      if (file.includes('adminFirebase')) continue; // its own app, built with getAuth()
      for (const m of src.matchAll(CALL)) {
        calls += 1;
        if (!m[2]?.includes('browserPopupRedirectResolver')) missing.push(`${file}: ${m[1]}`);
      }
    }
    expect(calls).toBeGreaterThanOrEqual(4);
    expect(missing).toEqual([]);
  });
});
