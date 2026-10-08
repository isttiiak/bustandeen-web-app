import { describe, it, expect } from 'vitest';
import en from '../locales/en/common.json';
import bn from '../locales/bn/common.json';

// T3.2 Friends: the page and its dialogs draw SVG
// icons only, their copy (and every locale string they use) has no emoji or em
// dashes, every key they use exists in both languages, every full-screen
// overlay is portaled (the page sits in AnimatedBackground's `relative z-10`,
// under the sticky navbar), and nothing hard-codes a colour, glows or floats.
const files = import.meta.glob<string>(['./Friends.tsx'], {
  query: '?raw',
  import: 'default',
  eager: true,
});
const DASH_OR_EMOJI = /—|\p{Extended_Pictographic}|[＋✓✔]/u;
const stripComments = (code: string) => code.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
// (profileParts' GoogleLogo is not imported here.)
const stripGoogleLogo = (code: string) => code.replace(/export function GoogleLogo[\s\S]*$/, '');

type Tree = { [k: string]: unknown };
const lookup = (dict: unknown, key: string): unknown =>
  key.split('.').reduce<unknown>((node, part) => (node as Tree | undefined)?.[part], dict);
/** A plural key (`t('x', { count })`) lives as x_one / x_other. */
const lookupAny = (dict: unknown, key: string): unknown =>
  lookup(dict, key) ?? lookup(dict, `${key}_other`);

/** Every `t('ns.key'` and `i18nKey="ns.key"` in the files, across line breaks. */
const usedKeys = [
  ...new Set(
    Object.values(files).flatMap((code) => [
      ...[...code.matchAll(/\bt\(\s*'([a-zA-Z]+\.[a-zA-Z.]+)'/g)].map((m) => m[1] as string),
      ...[...code.matchAll(/i18nKey="([a-zA-Z]+\.[a-zA-Z.]+)"/g)].map((m) => m[1] as string),
    ])
  ),
];

describe('Friends screen', () => {
  it('finds the Friends file', () => {
    expect(Object.keys(files).length).toBe(1);
    expect(usedKeys.length).toBeGreaterThan(60);
  });

  it.each(Object.keys(files))('%s renders no emoji or em dash', (path) => {
    expect(stripComments(files[path] ?? '')).not.toMatch(DASH_OR_EMOJI);
  });

  it.each(Object.keys(files))('%s portals any full-screen overlay', (path) => {
    const code = files[path] ?? '';
    if (/fixed inset-0/.test(code)) expect(code).toMatch(/createPortal\(/);
  });

  it.each(Object.keys(files))('%s has no hex colour, glow, Swal or endless animation', (path) => {
    const code = stripGoogleLogo(stripComments(files[path] ?? ''));
    expect(code).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(code).not.toMatch(/shadow-\[0_0_|repeat:\s*Infinity|sweetalert2/);
  });

  it('has exactly one arch hero', () => {
    const arches =
      Object.values(files)
        .join('\n')
        .match(/rounded-arch/g) ?? [];
    expect(arches).toHaveLength(1);
  });

  it.each([
    ['en', en],
    ['bn', bn],
  ])('%s: every key used exists, with no emoji or em dash', (_lang, dict) => {
    const missing = usedKeys.filter((k) => typeof lookupAny(dict, k) !== 'string');
    const bad = usedKeys.filter((k) => DASH_OR_EMOJI.test(String(lookupAny(dict, k) ?? '')));
    expect({ missing, bad }).toEqual({ missing: [], bad: [] });
  });
});
