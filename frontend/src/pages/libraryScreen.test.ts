import { describe, it, expect } from 'vitest';
import en from '../locales/en/common.json';
import bn from '../locales/bn/common.json';
import navbar from '../components/Navbar.tsx?raw';
import { CHROME } from '../seo/locales/chrome.js';
import { DUAS } from '../seo/content/duas.js';
import { MORNING_ADHKAR, EVENING_ADHKAR } from '../seo/content/adhkar.js';
import { ASMA_UL_HUSNA } from '../seo/content/asmaUlHusna.js';

// T3.2 Library (du'as, adhkar, 99 Names, zakat calculator): the four screens
// and their shared parts draw SVG icons only, have one arch each, no emoji,
// em dash, hard-coded colour or glow, and every string they show (library.*,
// the zakat chrome, the du'a/adhkar/Names data) is free of emoji and em
// dashes. Translations of the Quran and of a du'a keep their own punctuation
// (QUOTED). The screens have no overlay, so nothing needs a portal.
const files = import.meta.glob<string>(
  [
    './DuaLibrary.tsx',
    './AdhkarLibrary.tsx',
    './AsmaUlHusnaLibrary.tsx',
    './ZakatCalculatorLibrary.tsx',
    '../components/library/libraryParts.tsx',
  ],
  { query: '?raw', import: 'default', eager: true }
);
const SCREENS = Object.keys(files).filter((p) => p.endsWith('Library.tsx'));
const DASH_OR_EMOJI = /—|\p{Extended_Pictographic}|[✓✔→←]/u;
const stripComments = (code: string) => code.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
/** Quran / du'a translations, quoted as translated. */
const QUOTED = new Set(['ayat-al-kursi', 'forgiveness']);

type Tree = { [k: string]: unknown };
const strings = (node: unknown, prefix: string): [string, string][] =>
  typeof node === 'string'
    ? [[prefix, node]]
    : node && typeof node === 'object'
      ? Object.entries(node as Tree).flatMap(([k, v]) => strings(v, `${prefix}.${k}`))
      : [];

describe('Library screens', () => {
  it('finds the files', () => {
    expect(Object.keys(files).length).toBe(5);
    expect(SCREENS.length).toBe(4);
  });

  it.each(Object.keys(files))('%s renders no emoji or em dash', (path) => {
    expect(stripComments(files[path] ?? '')).not.toMatch(DASH_OR_EMOJI);
  });

  it.each(Object.keys(files))('%s has no hex colour, glow or old card style', (path) => {
    const code = stripComments(files[path] ?? '');
    expect(code).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(code).not.toMatch(
      /shadow-\[0_0_|repeat:\s*Infinity|animate-pulse|blur-3xl|bg-gradient-to-(br|r)\b|rounded-(xl|2xl|3xl)\b|bg-white\/\[|text-white\/[1-4]0\b/
    );
  });

  it.each(SCREENS)('%s has exactly one arch, the shared hero', (path) => {
    const code = stripComments(files[path] ?? '');
    expect((code.match(/<LibraryHero\b/g) ?? []).length).toBe(1);
    expect(code).not.toMatch(/rounded-arch/);
  });

  it('the navbar has a title, SVG icon and Home parent for every Library page', () => {
    for (const path of [
      '/library/duas',
      '/library/adhkar',
      '/library/asma-ul-husna',
      '/library/zakat-calculator',
    ]) {
      const entries = navbar.split(`'${path}'`).length - 1;
      expect(entries, path).toBe(3); // PAGE_KEYS, PAGE_META, PARENT_ROUTES
    }
  });

  it.each([
    ['en', en],
    ['bn', bn],
  ])('%s: library.* has no emoji or em dash', (_lang, dict) => {
    const bad = strings((dict as Tree).library, 'library')
      .filter(([, v]) => DASH_OR_EMOJI.test(v))
      .map(([k]) => k);
    expect(bad).toEqual([]);
  });

  it.each(['en', 'bn'] as const)('%s: the zakat calculator copy has no emoji or em dash', (l) => {
    const z = CHROME[l].zakat as unknown as Tree;
    const text = [
      ...strings(z, 'zakat').map(([, v]) => v),
      z.pricesAsOfLabel instanceof Function ? String(z.pricesAsOfLabel('2026-01-01')) : '',
    ];
    expect(text.filter((v) => DASH_OR_EMOJI.test(v))).toEqual([]);
  });

  it("the du'a, adhkar and Names text shown has no emoji or em dash outside quoted translations", () => {
    const items = [...DUAS, ...MORNING_ADHKAR, ...EVENING_ADHKAR, ...ASMA_UL_HUSNA] as {
      id: string;
    }[];
    const bad = items
      .filter((i) => !QUOTED.has(i.id))
      .flatMap((i) => strings(i, i.id))
      .filter(([, v]) => DASH_OR_EMOJI.test(v))
      .map(([k]) => k);
    expect(bad).toEqual([]);
  });

  // Istiak 2026-10-09: the jewellery checkbox stays a disclosure (no source to
  // change the maths); it only switches the hint for what to enter below.
  it('the jewellery checkbox switches a hint and never enters the sum', () => {
    const zakat = files['./ZakatCalculatorLibrary.tsx'];
    expect(zakat).toContain('includeJewelry ? z.jewelryIncludedHint : z.jewelryExcludedHint');
    const sum = zakat.match(/const totalAssets = (.*);/)?.[1] ?? '';
    expect(sum).not.toMatch(/jewel/i);
    for (const l of ['en', 'bn', 'ar'] as const) {
      expect(CHROME[l].zakat.jewelryIncludedHint).toBeTruthy();
      expect(CHROME[l].zakat.jewelryExcludedHint).toBeTruthy();
    }
  });
});
