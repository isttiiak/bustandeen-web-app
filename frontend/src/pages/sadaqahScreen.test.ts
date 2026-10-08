import { describe, it, expect } from 'vitest';
import en from '../locales/en/common.json';
import bn from '../locales/bn/common.json';

// T3.2 Sadaqah: the four public sadaqah pages draw SVG icons only, their copy
// (and every locale string they use) has no emoji or em dashes, every key
// they use exists in both languages, each page has at most one arch hero, and
// nothing hard-codes a colour, glows or animates forever (the old blur orb).
const files = import.meta.glob<string>(
  ['./Sadaqah.tsx', './SadaqahDonate.tsx', './SadaqahThankYou.tsx', './SadaqahVerify.tsx'],
  { query: '?raw', import: 'default', eager: true }
);
const DASH_OR_EMOJI = /—|\p{Extended_Pictographic}/u;
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

describe('Sadaqah screens', () => {
  it('finds the Sadaqah files', () => {
    expect(Object.keys(files)).toHaveLength(4);
    expect(usedKeys.length).toBeGreaterThan(40);
  });

  it.each(Object.keys(files))('%s renders no emoji or em dash', (path) => {
    expect(stripComments(files[path] ?? '')).not.toMatch(DASH_OR_EMOJI);
  });

  it.each(Object.keys(files))(
    '%s has one arch, no hex colour, glow or endless animation',
    (path) => {
      const code = stripComments(files[path] ?? '');
      expect(code.match(/rounded-arch/g)).toHaveLength(1);
      expect(code).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(code).not.toMatch(/shadow-\[0_0_|repeat:\s*Infinity|blur-3xl|bg-gradient-to-br/);
    }
  );

  it.each([
    ['en', en],
    ['bn', bn],
  ])('%s: every key used exists, with no emoji or em dash', (_lang, dict) => {
    const missing = usedKeys.filter((k) => typeof lookup(dict, k) !== 'string');
    const bad = usedKeys.filter((k) => DASH_OR_EMOJI.test(String(lookup(dict, k) ?? '')));
    expect({ missing, bad }).toEqual({ missing: [], bad: [] });
  });
});
