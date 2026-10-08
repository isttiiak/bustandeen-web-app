import { describe, it, expect } from 'vitest';
import en from '../locales/en/common.json';
import bn from '../locales/bn/common.json';
import { ASR_MADHABS, CALC_METHODS } from '../utils/salatPrefs.js';

// T3.2 Prayer time settings: the drawer, the location picker (also the
// first-run prompt on Prayer Times) and the one-time "usual times" card draw
// SVG icons only, their copy and every locale string they use has no emoji or
// em dashes, every key exists in both languages, the drawer is portaled (the
// page sits under the sticky navbar), and nothing hard-codes a colour or glows.
// The method and ʿAṣr labels shown in the drawer come from salatPrefs.ts.
const files = import.meta.glob<string>(
  [
    '../components/PrayerTimeSettings.tsx',
    '../components/LocationPicker.tsx',
    '../components/PrayerDefaultsSuggestion.tsx',
  ],
  { query: '?raw', import: 'default', eager: true }
);
const DASH_OR_EMOJI = /—|\p{Extended_Pictographic}|[✓✔→]/u;
const stripComments = (code: string) => code.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

type Tree = { [k: string]: unknown };
const lookup = (dict: unknown, key: string): unknown =>
  key.split('.').reduce<unknown>((node, part) => (node as Tree | undefined)?.[part], dict);

/** Every `t('ns.key'` in the files, across line breaks. */
const usedKeys = [
  ...new Set(
    Object.values(files).flatMap((code) =>
      [...code.matchAll(/\bt\(\s*'([a-zA-Z]+\.[a-zA-Z0-9.]+)'/g)].map((m) => m[1] as string)
    )
  ),
];

describe('Prayer time settings', () => {
  it('finds the files and keys', () => {
    expect(Object.keys(files).length).toBe(3);
    expect(usedKeys.length).toBeGreaterThan(35);
  });

  it.each(Object.keys(files))('%s renders no emoji or em dash', (path) => {
    expect(stripComments(files[path] ?? '')).not.toMatch(DASH_OR_EMOJI);
  });

  it.each(Object.keys(files))('%s has no hex colour, glow or old radius', (path) => {
    const code = stripComments(files[path] ?? '');
    expect(code).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(code).not.toMatch(
      /shadow-\[0_0_|repeat:\s*Infinity|animate-pulse|blur-3xl|bg-gradient-to-|rounded-(2xl|xl)\b/
    );
    // Toasts use the default check, not an emoji icon.
    expect(code).not.toMatch(/\bicon:\s*'/);
  });

  it('portals the drawer', () => {
    const code = files['../components/PrayerTimeSettings.tsx'] ?? '';
    expect(code).toMatch(/fixed inset-0/);
    expect(code).toMatch(/createPortal\(/);
  });

  it('shows method and ʿAṣr labels without emoji or em dashes', () => {
    for (const m of [...CALC_METHODS, ...ASR_MADHABS]) {
      expect(`${m.label} ${m.detail}`).not.toMatch(DASH_OR_EMOJI);
    }
  });

  it.each([
    ['en', en],
    ['bn', bn],
  ])('%s: every key used exists, with no emoji or em dash', (_lang, dict) => {
    const missing = usedKeys.filter((k) => typeof lookup(dict, k) !== 'string');
    const bad = usedKeys.filter((k) => DASH_OR_EMOJI.test(String(lookup(dict, k) ?? '')));
    expect({ missing, bad }).toEqual({ missing: [], bad: [] });
  });
});
