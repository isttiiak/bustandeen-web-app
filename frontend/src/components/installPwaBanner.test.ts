import { describe, it, expect } from 'vitest';
import en from '../locales/en/common.json';
import bn from '../locales/bn/common.json';
import code from './InstallPwaBanner.tsx?raw';

// T3.2 InstallPwaBanner: the install card on the landing uses the shared
// button classes and theme tokens, is portaled out of the page's z-10 layer,
// keeps text readable (no ink below /70) and its copy has no emoji or em dash
// in en + bn.
const DASH_OR_EMOJI = /—|\p{Extended_Pictographic}|[×✓✔→]/u;
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

describe('InstallPwaBanner', () => {
  it('has no emoji, em dash, faint ink, old radius, blur or raw colour', () => {
    const src = stripComments(code);
    expect(src).not.toMatch(DASH_OR_EMOJI);
    expect(src).not.toMatch(/text-white\/[1-6]0\b/);
    expect(src).not.toMatch(/bg-white\/|rounded-(xl|2xl|3xl|full)\b|backdrop-blur|shadow-2xl/);
    expect(src).not.toMatch(/rgba\(|#[0-9a-fA-F]{3,8}\b|shadow-\[0_0_/);
    expect(src).toContain('BTN_PRIMARY');
    expect(src).toContain('BTN_SECONDARY');
    expect(src).toContain('createPortal');
  });

  it.each([
    ['en', en],
    ['bn', bn],
  ] as const)('%s: pwa copy has no emoji or em dash', (_l, dict) => {
    const values = Object.values(dict.pwa);
    expect(values.length).toBeGreaterThan(0);
    for (const v of values) expect(v).not.toMatch(DASH_OR_EMOJI);
  });
});
