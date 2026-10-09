import { it, expect } from 'vitest';
import en from '../locales/en/common.json';
import bn from '../locales/bn/common.json';
import overlay from './SigningInOverlay.tsx?raw';
import legal from './LegalAgreeLine.tsx?raw';

// T3.2 quick pass: the "Signing you in..." overlay and the terms line under the
// auth forms use theme tokens only (no emoji, em dash, faint ink or raw colour),
// the overlay stays a polite live region, and the legal links keep their
// `components` mapping (positional <Trans> children dropped text before).
const DASH_OR_EMOJI = /—|\p{Extended_Pictographic}/u;
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

it.each([
  ['SigningInOverlay', overlay],
  ['LegalAgreeLine', legal],
])('%s uses theme tokens only', (_n, code) => {
  const src = stripComments(code);
  expect(src).not.toMatch(DASH_OR_EMOJI);
  expect(src).not.toMatch(/text-white\/[1-6]0\b/);
  expect(src).not.toMatch(/bg-white\/|bg-black\/|rounded-(lg|xl|2xl|3xl)\b|backdrop-blur/);
  expect(src).not.toMatch(/rgba\(|#[0-9a-fA-F]{3,8}\b|shadow-\[|shadow-(lg|xl|2xl)\b/);
});

it('the overlay is a live status card with the leaf mark', () => {
  expect(overlay).toContain('role="status"');
  expect(overlay).toContain('aria-live="polite"');
  expect(overlay).toContain('CARD');
  expect(overlay).toContain('<LeafIcon');
  expect(overlay).toContain('motion-reduce:hidden');
});

it('the legal links go through components and show focus', () => {
  expect(legal).toContain('components={{');
  expect(legal).toContain('focus-visible:ring-2');
  for (const dict of [en, bn]) {
    for (const v of [dict.legal.agreeSignIn, dict.legal.agreeSignUp, dict.authSignIn.signingIn]) {
      expect(v).not.toMatch(DASH_OR_EMOJI);
    }
    expect(dict.legal.agreeSignIn).toMatch(/<1>.+<\/1>.+<3>.+<\/3>/);
  }
});
