import { describe, it, expect } from 'vitest';
import en from '../locales/en/common.json';
import bn from '../locales/bn/common.json';
import { AYATUL_KURSI_REF, TASBIH_MODES } from '../utils/salatPrefs.js';

// T3.2 Salat settings: the drawer draws SVG icons only, its copy and every
// locale string it uses has no emoji or em dashes, every key exists in both
// languages, it is portaled (the tracker sits under the sticky navbar), and
// nothing hard-codes a colour or glows. The tasbīḥ and Ayatul Kursi wording
// shown in the drawer comes from salatPrefs.ts.
const files = import.meta.glob<string>('../components/SalatSettings.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const code = Object.values(files)[0] ?? '';
const DASH_OR_EMOJI = /—|\p{Extended_Pictographic}|[✓✔→]/u;
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

type Tree = { [k: string]: unknown };
const lookup = (dict: unknown, key: string): unknown =>
  key.split('.').reduce<unknown>((node, part) => (node as Tree | undefined)?.[part], dict);

/** Every `t('ns.key'` in the drawer, across line breaks. */
const usedKeys = [
  ...new Set(
    [...code.matchAll(/\bt\(\s*'([a-zA-Z]+\.[a-zA-Z0-9.]+)'/g)].map((m) => m[1] as string)
  ),
];

describe('Salat settings', () => {
  it('finds the file and keys', () => {
    expect(Object.keys(files).length).toBe(1);
    expect(usedKeys.length).toBeGreaterThan(30);
  });

  it('renders no emoji or em dash', () => {
    expect(stripComments(code)).not.toMatch(DASH_OR_EMOJI);
  });

  it('has no hex colour, glow, emoji toast or old radius', () => {
    const src = stripComments(code);
    expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(src).not.toMatch(
      /shadow-\[0_0_|repeat:\s*Infinity|animate-pulse|blur-3xl|bg-gradient-to-|rounded-(2xl|xl|lg)\b/
    );
    expect(src).not.toMatch(/\bicon:\s*'/);
  });

  it('portals the drawer and keeps the source link outside the choice button', () => {
    expect(code).toMatch(/fixed inset-0/);
    expect(code).toMatch(/createPortal\(/);
    // A link nested in a <button> is invalid HTML; it is a sibling now, so no stopPropagation.
    expect(stripComments(code)).not.toMatch(/stopPropagation/);
  });

  it('shows tasbīḥ and Ayatul Kursi wording without emoji or em dashes', () => {
    for (const m of TASBIH_MODES) {
      expect(`${m.label} ${m.summary} ${m.virtue ?? ''}`).not.toMatch(DASH_OR_EMOJI);
    }
    expect(AYATUL_KURSI_REF.virtue).not.toMatch(DASH_OR_EMOJI);
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
