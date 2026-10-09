import { describe, it, expect } from 'vitest';
import en from '../locales/en/common.json';
import bn from '../locales/bn/common.json';
import learn from './HifzLearnModal.tsx?raw';
import review from './HifzReviewModal.tsx?raw';
import share from './ShareAyahModal.tsx?raw';

// T3.2 Hifz learn/review + Share āyah modals: portaled above the navbar, theme
// card + shared buttons/options, no emoji or em dash, ink never below /70, no
// raw colours in app chrome (the share-card themes are data, not chrome), and
// the hifz + shareAyah copy is clean in en + bn.
const DASH_OR_EMOJI = /—|\p{Extended_Pictographic}|[×✓✔→]/u;
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

describe.each([
  ['HifzLearnModal', learn],
  ['HifzReviewModal', review],
  ['ShareAyahModal', share],
])('%s', (_name, code) => {
  const src = stripComments(code);

  it('is a portaled theme dialog', () => {
    expect(src).toContain('createPortal');
    expect(src).toContain('role="dialog"');
    expect(src).toContain('aria-labelledby');
    expect(src).toMatch(/rounded-(t-)?card/);
    expect(src).toContain('shadow-elev-3');
    expect(src).toMatch(/z-\[(7|8)0\]/);
  });

  it('has no emoji, em dash, faint ink, old radius or raw colour', () => {
    expect(src).not.toMatch(DASH_OR_EMOJI);
    expect(src).not.toMatch(/text-white\/[1-6]0\b/);
    expect(src).not.toMatch(/bg-white\/|rounded-(lg|xl|2xl|3xl)\b|font-black/);
    expect(src).not.toMatch(/rgba\(|#[0-9a-fA-F]{3,8}\b|red-500|shadow-\[0_0_|conic-gradient/);
    expect(src).not.toMatch(/className="btn\b/);
  });
});

it('Hifz learn uses the shared buttons, Share uses the shared options', () => {
  expect(learn).toContain('BTN_PRIMARY');
  expect(learn).toContain('BTN_SECONDARY');
  expect(share).toContain('OPTION_ON');
  expect(share).toContain('OPTION_OFF');
});

describe.each([
  ['en', en],
  ['bn', bn],
] as const)('%s copy', (_l, dict) => {
  const flat = (o: unknown): string[] =>
    typeof o === 'string' ? [o] : Object.values(o as object).flatMap(flat);
  it.each(['hifz', 'shareAyah'] as const)('%s has no emoji, arrow or em dash', (ns) => {
    const values = flat(dict[ns]);
    expect(values.length).toBeGreaterThan(0);
    for (const v of values) expect(v).not.toMatch(DASH_OR_EMOJI);
  });
});
