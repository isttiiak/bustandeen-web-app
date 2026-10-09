import { describe, it, expect } from 'vitest';
import { shouldUseRedirect } from './googleSignIn.js';

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
