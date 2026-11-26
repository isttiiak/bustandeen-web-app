import { describe, it, expect } from 'vitest';
import en from '../../locales/en/common.json';
import bn from '../../locales/bn/common.json';
import code from './TodayHighlights.tsx?raw';
import homePage from '../../pages/Home.tsx?raw';
import homeHero from './HomePrayerHero.tsx?raw';
import homeSpecialBlock from './HomeSpecialBlock.tsx?raw';

// Home was split into parts (audit P4-1): the page, the arch and the special-day block.
const home = [homePage, homeHero, homeSpecialBlock].join('\n');

// Home special-day layouts (Settings → Home): SVG icons and theme tokens only,
// new copy without em dashes in en + bn, and Home renders every layout.
const DASH_OR_EMOJI = /—|\p{Extended_Pictographic}/u;
const NEW_COPY = {
  home: ['todayHighlights', 'todayMore'],
  settings: [
    'homeSection',
    'homeSubtitle',
    'homeSpecialFull',
    'homeSpecialFullDetail',
    'homeSpecialStrip',
    'homeSpecialStripDetail',
    'homeSpecialPills',
    'homeSpecialPillsDetail',
  ],
} as const;

describe('TodayHighlights', () => {
  it('uses tokens and SVG icons, no emoji or raw colour', () => {
    expect(code).not.toMatch(DASH_OR_EMOJI);
    expect(code).not.toMatch(/rgba\(|#[0-9a-fA-F]{3,8}\b|bg-white\/|rounded-(xl|2xl|3xl)\b/);
  });

  it('Home renders the strip, the arch chips and the full block', () => {
    expect(home).toContain('variant="strip"');
    expect(home).toContain('variant="pills"');
    // Every layout keeps the detailed block (Friday cards too) under the arch.
    expect(homePage).toMatch(/<HomeSpecialBlock/);
    expect(home).not.toMatch(/homeLayout !== 'full' && hasSpecialBlock/);
    expect(home).toContain('id={TODAY_SPECIAL_ID}');
  });

  it.each([
    ['en', en],
    ['bn', bn],
  ] as const)('%s: new copy exists without em dash', (_l, dict) => {
    for (const [ns, keys] of Object.entries(NEW_COPY)) {
      const d = (dict as unknown as Record<string, Record<string, unknown>>)[ns];
      for (const k of keys) {
        expect(typeof d[k], `${ns}.${k}`).toBe('string');
        expect(d[k]).not.toMatch(DASH_OR_EMOJI);
      }
    }
  });
});
