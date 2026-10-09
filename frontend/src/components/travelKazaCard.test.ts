import { describe, it, expect } from 'vitest';
import en from '../locales/en/common.json';
import bn from '../locales/bn/common.json';

// T3.2 Travel kaza (Salat): the card draws SVG icons only (prayer glyphs,
// briefcase, scissors, check, book, chevron, external link), keeps text
// readable (no ink below /70), uses the theme radii and tokens instead of
// white fills, and every travelKaza string is free of emoji and em dashes in
// en + bn.
const code = (
  import.meta.glob<string>(['./TravelKazaCard.tsx'], {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>
)['./TravelKazaCard.tsx']!;
const DASH_OR_EMOJI = /—|\p{Extended_Pictographic}|[✓✔→↗▲▼]/u;
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

describe('TravelKazaCard', () => {
  it('has no emoji, em dash, faint ink, old radius or white fill', () => {
    const src = stripComments(code);
    expect(src).not.toMatch(DASH_OR_EMOJI);
    expect(src).not.toMatch(/text-white\/[1-6][05]?\b/);
    expect(src).not.toMatch(/(bg|border)-white\/|rounded-(xl|2xl|3xl)\b|font-black/);
    expect(src).not.toMatch(/rgba\(|#[0-9a-fA-F]{3,8}\b/);
  });

  it('draws the prayer with its glyph', () => {
    expect(code).toContain('<PrayerGlyph');
    expect(code).not.toContain('PRAYER_ICON');
  });

  it.each([
    ['en', en],
    ['bn', bn],
  ] as const)('%s: travelKaza copy has no emoji or em dash', (_l, dict) => {
    const bad = Object.entries((dict as { travelKaza: Record<string, string> }).travelKaza)
      .filter(([, v]) => DASH_OR_EMOJI.test(v))
      .map(([k]) => k);
    expect(bad).toEqual([]);
  });
});
