import { afterEach, describe, expect, it, vi } from 'vitest';
import { hasSessionHint, SESSION_MARKER } from './authClient.js';

// hasSessionHint decides whether Firebase loads up front. A false "no" would
// show a signed-in person as a guest, so every key a session can leave behind
// must count.
describe('hasSessionHint', () => {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });

  afterEach(() => store.clear());

  it('is false for a visitor who never signed in', () => {
    store.set('bustandeen_theme', 'light');
    store.set('bustandeen_lang', 'bn');
    expect(hasSessionHint()).toBe(false);
  });

  it.each([SESSION_MARKER, 'bustandeen_idToken', 'bustandeen_user'])('is true with %s', (key) => {
    store.set(key, 'x');
    expect(hasSessionHint()).toBe(true);
  });

  it('loads Firebase when storage is blocked', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('SecurityError');
      },
    });
    expect(hasSessionHint()).toBe(true);
  });
});
