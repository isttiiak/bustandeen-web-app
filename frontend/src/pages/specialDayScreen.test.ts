import { describe, it, expect } from 'vitest';
import en from '../locales/en/common.json';
import bn from '../locales/bn/common.json';
import code from './IslamicSpecialDay.tsx?raw';
import { SPECIAL_DAYS } from '../utils/islamicCalendar.js';

// T3.2 Special day page: one arch hero with the shared card/button classes,
// SVG icons only (not the emoji in the SPECIAL_DAYS data), theme tokens instead
// of each day's hex colour, readable ink (no ink below /70), and its own labels
// free of emoji, arrows and em dashes in en + bn. The footer quote was dropped:
// it is a weak report, not a saying of Ibn al-Qayyim.
const DASH_OR_EMOJI = /—|\p{Extended_Pictographic}|[✓✔←→↗]/u;
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
const CHROME = [
  'notFound',
  'backHome',
  'trackFast',
  'significanceLabel',
  'whatToDoLabel',
  'referencesLabel',
  'viewSource',
] as const;

describe('IslamicSpecialDay', () => {
  it('has no emoji, em dash, faint ink, old radius or raw colour', () => {
    const src = stripComments(code);
    expect(src).not.toMatch(DASH_OR_EMOJI);
    expect(src).not.toMatch(/text-white\/[1-6]0\b/);
    expect(src).not.toMatch(/bg-white\/|rounded-(xl|2xl|3xl)\b|font-black/);
    expect(src).not.toMatch(/rgba\(|#[0-9a-fA-F]{3,8}\b|red-500|shadow-\[0_0_|day\.color/);
    expect(src).not.toMatch(/day\.icon|todo\.icon|footerQuote/);
  });

  it('is one arch hero with the shared classes', () => {
    expect(code.match(/rounded-arch/g)).toHaveLength(1);
    expect(code).toContain('BTN_PRIMARY');
    expect(code).toContain('CARD');
    expect(code).not.toMatch(/className="(card|btn)\b/);
  });

  it.each([
    ['en', en],
    ['bn', bn],
  ] as const)('%s: page labels have no emoji, arrow or em dash', (_l, dict) => {
    const sd = dict.specialDays as Record<string, unknown>;
    for (const k of CHROME) {
      expect(typeof sd[k]).toBe('string');
      expect(sd[k]).not.toMatch(DASH_OR_EMOJI);
    }
    expect(sd.footerQuote).toBeUndefined();
  });

  // DaifExplainer rule: every ḍaʿīf grade on a page gets an explainer card.
  it('maps every day with a ḍaʿīf grade to a DaifExplainer topic', () => {
    const weak = SPECIAL_DAYS.filter((d) => d.references.some((r) => /Ḍaʿīf/i.test(r.grade ?? '')));
    expect(weak.map((d) => d.id).sort()).toEqual(['fast_mon_thu', 'shab_e_barat']);
    for (const d of weak) expect(code).toContain(`  ${d.id}: ['`);
    expect(code).toContain('<DaifExplainer topics={daifTopics} />');
  });
});
