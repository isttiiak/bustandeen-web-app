import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CONSENT_KEY, onConsentChange, readConsent, writeConsent } from './analyticsConsent.js';

// Audit 2026-11-16 P2-10: analytics may only run after the person said yes. The choice lives
// on this device only.

function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    data,
  };
}

describe('analytics consent', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', fakeStorage());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is "unset" until the person chooses, which counts as no', () => {
    expect(readConsent()).toBe('unset');
  });

  it('remembers a yes and a no on this device', () => {
    writeConsent('granted');
    expect(readConsent()).toBe('granted');
    expect(localStorage.getItem(CONSENT_KEY)).toBe('granted');
    writeConsent('denied');
    expect(readConsent()).toBe('denied');
  });

  it('reads anything unexpected as unset', () => {
    vi.stubGlobal('localStorage', fakeStorage({ [CONSENT_KEY]: 'yes please' }));
    expect(readConsent()).toBe('unset');
  });

  it('tells listeners, and a listener can stop listening', () => {
    const seen: string[] = [];
    const stop = onConsentChange((c) => seen.push(c));
    writeConsent('granted');
    writeConsent('denied');
    stop();
    writeConsent('granted');
    expect(seen).toEqual(['granted', 'denied']);
  });

  it('survives storage being blocked: no choice, no crash', async () => {
    vi.resetModules();
    const fresh = await import('./analyticsConsent.js');
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });
    expect(fresh.readConsent()).toBe('unset');
    const seen: string[] = [];
    fresh.onConsentChange((c) => seen.push(c));
    expect(() => fresh.writeConsent('granted')).not.toThrow();
    // Not saved, so the next visit asks again; but this visit still honours the answer it was given.
    expect(seen).toContain('granted');
    expect(fresh.readConsent()).toBe('granted');
  });
});
