import { describe, it, expect } from 'vitest';
import en from '../locales/en/common.json';
import bn from '../locales/bn/common.json';
import { formatLocaleNumber } from '../utils/localeDate.js';

// T3.2 Ramadan: the tracker, analytics and the cards they render draw SVG
// icons only, and their copy has no emoji or em dashes.
const files = {
  ...import.meta.glob<string>('./Ramadan*.tsx', { query: '?raw', import: 'default', eager: true }),
  ...import.meta.glob<string>(
    [
      '../components/RamadanSalatCard.tsx',
      '../components/ExcusedCard.tsx',
      '../components/DaifExplainer.tsx',
    ],
    { query: '?raw', import: 'default', eager: true }
  ),
};
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2B55}]/u;
const DASH_OR_EMOJI = /—|[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2B55}]/u;

type Tree = { [k: string]: string | Tree };
function strings(node: Tree, path: string, out: Array<[string, string]>) {
  for (const [k, v] of Object.entries(node)) {
    if (typeof v === 'string') out.push([`${path}.${k}`, v]);
    else strings(v, `${path}.${k}`, out);
  }
  return out;
}

describe('Ramadan screens', () => {
  it('finds the Ramadan files', () => {
    expect(Object.keys(files).length).toBeGreaterThanOrEqual(5);
  });

  it.each(Object.keys(files))('%s renders no emoji', (path) => {
    // comments may mention emoji; JSX and strings may not
    const code = (files[path] ?? '').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    expect(code).not.toMatch(EMOJI);
  });

  it.each([
    ['en', en],
    ['bn', bn],
  ])('%s Ramadan copy has no emoji or em dashes', (_lang, dict) => {
    const d = dict as unknown as Tree;
    const bad = ['ramadan', 'ramadanSalat', 'ramadanAnalytics', 'excusedCard', 'daifExplainer']
      .flatMap((ns) => strings(d[ns] as Tree, ns, []))
      .filter(([, v]) => DASH_OR_EMOJI.test(v))
      .map(([key]) => key);
    expect(bad).toEqual([]);
  });

  it('a Hijri year is written without a thousands separator', () => {
    expect(formatLocaleNumber(1448)).toBe('1,448');
    expect(formatLocaleNumber(1448, { useGrouping: false })).toBe('1448');
  });
});

// The "Prepare your heart" rows are stretched links. Their Bukhārī 1969
// citation once sat INSIDE the row's <Link>: an <a> in an <a> is invalid HTML
// (React validateDOMNesting) and the tap went to /fasting, not the source.
describe('Ramadan prepare rows', () => {
  const src = Object.entries(files).find(([k]) => k.endsWith('RamadanTracker.tsx'))?.[1] ?? '';
  const prepBlock = src.slice(src.indexOf('const prep:'), src.indexOf('const virtues:'));

  it('keep the citation out of the row label', () => {
    expect(prepBlock).toContain("href: 'https://sunnah.com/bukhari:1969'");
    expect(prepBlock).not.toMatch(/<a[\s>]/);
  });

  it('draw the citation beside the row link, above its stretched area', () => {
    const row = src.slice(src.indexOf('{prep.map('), src.indexOf('))}', src.indexOf('{prep.map(')));
    expect(row).toContain('after:absolute after:inset-0');
    expect(row).toMatch(/<\/Link>\s*\{p\.cite &&/);
    expect(row).toContain('relative z-10');
  });
});
