import { describe, it, expect } from 'vitest';
import en from '../locales/en/common.json';
import bn from '../locales/bn/common.json';

// T3.2 Settings: the page, its Zikr library, the Quran and Zikr settings
// drawers and the zikr edit/info dialogs draw SVG icons only, their copy (and
// every locale string they use) has no emoji or em dashes, every key they use
// exists in both languages, and every full-screen overlay is portaled (the
// page sits in AnimatedBackground's `relative z-10`, under the sticky navbar).
// quranPrefs.ts holds the Arabic font labels shown in the Quran drawer.
const files = import.meta.glob<string>(
  [
    './Settings.tsx',
    '../components/ZikrLibrarySection.tsx',
    '../components/ZikrSuggestForm.tsx',
    '../components/ZikrSettings.tsx',
    '../components/EditZikrModal.tsx',
    '../components/QuranSettings.tsx',
    '../components/TrackingDayInfoModal.tsx',
    '../components/zikr/zikrCategoryIcons.tsx',
    '../utils/quranPrefs.ts',
  ],
  { query: '?raw', import: 'default', eager: true }
);
const DASH_OR_EMOJI = /—|\p{Extended_Pictographic}|[＋✓✔]/u;
const stripComments = (code: string) => code.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

type Tree = { [k: string]: unknown };
const lookup = (dict: unknown, key: string): unknown =>
  key.split('.').reduce<unknown>((node, part) => (node as Tree | undefined)?.[part], dict);

/** Every `t('ns.key'` and `i18nKey="ns.key"` in the files, across line breaks. */
const usedKeys = [
  ...new Set(
    Object.values(files).flatMap((code) => [
      ...[...code.matchAll(/\bt\(\s*'([a-zA-Z]+\.[a-zA-Z.]+)'/g)].map((m) => m[1] as string),
      ...[...code.matchAll(/i18nKey="([a-zA-Z]+\.[a-zA-Z.]+)"/g)].map((m) => m[1] as string),
    ])
  ),
];

describe('Settings screen', () => {
  it('finds the Settings files', () => {
    expect(Object.keys(files).length).toBe(9);
    expect(usedKeys.length).toBeGreaterThan(100);
  });

  it.each(Object.keys(files))('%s renders no emoji or em dash', (path) => {
    expect(stripComments(files[path] ?? '')).not.toMatch(DASH_OR_EMOJI);
  });

  it.each(Object.keys(files))('%s portals any full-screen overlay', (path) => {
    const code = files[path] ?? '';
    if (/fixed inset-0/.test(code)) expect(code).toMatch(/createPortal\(/);
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
