import { describe, it, expect } from 'vitest';
import en from '../locales/en/common.json';
import bn from '../locales/bn/common.json';
import page from './PrayerTimes.tsx?raw';

// T3.2 Prayer Times: the page draws SVG icons only (PrayerGlyph by id, no
// emoji in the timeline data), its copy and every locale string it uses has
// no emoji or em dashes, every key exists in both languages, there is one
// arch hero (the live clock), and nothing hard-codes a colour, glows or
// animates forever. Quoted hadith translations (the `*Hadith` strings) keep
// their own punctuation; only the separator before each source changed.
const DASH_OR_EMOJI = /—|\p{Extended_Pictographic}|[✓✔▾▲▼●]/u;
const stripComments = (code: string) => code.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
/** The page without its quoted-hadith fallbacks. */
const withoutHadith = (code: string) =>
  code.replace(/t\(\s*'prayerTimes\.\w+Hadith',\s*'(?:[^'\\]|\\.)*'\s*\)/g, "t('')");

type Tree = { [k: string]: unknown };
const lookup = (dict: unknown, key: string): unknown =>
  key.split('.').reduce<unknown>((node, part) => (node as Tree | undefined)?.[part], dict);

const usedKeys = [
  ...new Set(
    [...page.matchAll(/\bt\(\s*'([a-zA-Z]+\.[a-zA-Z0-9.]+)'/g)].map((m) => m[1] as string)
  ),
];
const isHadith = (k: string) => /Hadith$/.test(k);

describe('Prayer Times screen', () => {
  it('finds the keys', () => {
    expect(usedKeys.length).toBeGreaterThan(40);
  });

  it('renders no emoji or em dash', () => {
    expect(withoutHadith(stripComments(page))).not.toMatch(DASH_OR_EMOJI);
  });

  it('has one arch, no hex colour, glow or endless animation', () => {
    const code = stripComments(page);
    expect(code.match(/rounded-arch/g)).toHaveLength(1);
    expect(code).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(code).not.toMatch(
      /shadow-\[0_0_|repeat:\s*Infinity|animate-pulse|blur-3xl|bg-gradient-to-(br|r)\b/
    );
    // Timeline entries carry PrayerGlyph ids, not emoji icons.
    expect(code).not.toMatch(/\bicon:\s*'/);
  });

  it.each([
    ['en', en],
    ['bn', bn],
  ])('%s: every key used exists, with no emoji or em dash', (_lang, dict) => {
    const missing = usedKeys.filter((k) => typeof lookup(dict, k) !== 'string');
    const bad = usedKeys.filter(
      (k) => !isHadith(k) && DASH_OR_EMOJI.test(String(lookup(dict, k) ?? ''))
    );
    // Hadith strings: no em dash right before a source (after the closing quote).
    const badSeparator = usedKeys.filter(
      (k) => isHadith(k) && /"\s*—/.test(String(lookup(dict, k) ?? ''))
    );
    expect({ missing, bad, badSeparator }).toEqual({ missing: [], bad: [], badSeparator: [] });
  });
});
