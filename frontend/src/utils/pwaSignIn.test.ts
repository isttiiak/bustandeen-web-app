import { describe, it, expect } from 'vitest';
import { RELOAD_GUARD_MS, shouldReloadForStaleChunk } from './staleChunkReload.js';
import { shouldUseRedirect } from './googleSignIn.js';

describe('stale chunk reload guard', () => {
  const now = 1_800_000_000_000;

  it('reloads when this tab has not reloaded for a chunk yet', () => {
    expect(shouldReloadForStaleChunk(now, null)).toBe(true);
    expect(shouldReloadForStaleChunk(now, 'garbage')).toBe(true);
  });

  it('does not reload again within the guard window (no reload loop)', () => {
    expect(shouldReloadForStaleChunk(now, String(now - 1_000))).toBe(false);
    expect(shouldReloadForStaleChunk(now, String(now - RELOAD_GUARD_MS))).toBe(false);
  });

  it('reloads again once the guard window has passed, or the clock went back', () => {
    expect(shouldReloadForStaleChunk(now, String(now - RELOAD_GUARD_MS - 1))).toBe(true);
    expect(shouldReloadForStaleChunk(now, String(now + 60_000))).toBe(true);
  });

  it('never reloads while offline (that would show the browser offline page)', () => {
    expect(shouldReloadForStaleChunk(now, null, false)).toBe(false);
    expect(shouldReloadForStaleChunk(now, null, true)).toBe(true);
  });
});

describe('Google sign-in: popup or redirect', () => {
  it('keeps the popup in a browser tab', () => {
    expect(shouldUseRedirect('bustandeen.com', 'bustandeen.com', false)).toBe(false);
  });

  it('keeps the popup in the installed app while authDomain is firebaseapp.com', () => {
    expect(shouldUseRedirect('ihsan-9e89b.firebaseapp.com', 'bustandeen.com', true)).toBe(false);
    expect(shouldUseRedirect(undefined, 'bustandeen.com', true)).toBe(false);
  });

  it('redirects in the installed app once authDomain is our own host', () => {
    expect(shouldUseRedirect('bustandeen.com', 'bustandeen.com', true)).toBe(true);
  });
});
