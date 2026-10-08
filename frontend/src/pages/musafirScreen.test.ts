import { describe, it, expect } from 'vitest';
import en from '../locales/en/common.json';
import bn from '../locales/bn/common.json';
import { MUSAFIR_DUAS, MUSAFIR_RULINGS } from '../utils/musafir.js';
import { MUSAFIR_ICON_IDS } from '../components/musafir/musafirIcons.js';

// T3.2 Musafir: the page and its tracker banner draw SVG icons only, their
// copy (and every locale string they use) has no emoji or em dashes, every key
// they use exists in both languages, the page has one arch hero, overlays are
// portaled (ConfirmDialog), and nothing hard-codes a colour, glows, floats or
// animates forever (the old floating plane and the bus driving on a loop).
const files = import.meta.glob<string>(
  ['./MusafirMode.tsx', '../components/MusafirBanner.tsx', '../components/musafir/*.tsx'],
  { query: '?raw', import: 'default', eager: true }
);
const page = './MusafirMode.tsx';
const DASH_OR_EMOJI = /—|\p{Extended_Pictographic}|[✓✔▾▲▼]/u;
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

describe('Musafir screen', () => {
  it('finds the Musafir files', () => {
    expect(Object.keys(files)).toHaveLength(3);
    expect(usedKeys.length).toBeGreaterThan(60);
  });

  it.each(Object.keys(files))('%s renders no emoji or em dash', (path) => {
    expect(stripComments(files[path] ?? '')).not.toMatch(DASH_OR_EMOJI);
  });

  it.each(Object.keys(files))(
    '%s has no hex colour, glow, gradient sweep or endless animation',
    (path) => {
      const code = stripComments(files[path] ?? '');
      expect(code).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(code).not.toMatch(
        /shadow-\[0_0_|repeat:\s*Infinity|animate-pulse|blur-3xl|bg-gradient-to-(br|r)\b|\.emoji\b/
      );
    }
  );

  it('the page has exactly one arch hero and no local fixed overlay', () => {
    const code = stripComments(files[page] ?? '');
    expect(code.match(/rounded-arch/g)).toHaveLength(1);
    // Full-screen overlays go through ConfirmDialog (portaled to <body>).
    expect(code).not.toMatch(/\bfixed inset-0\b/);
  });

  it('every ruling and du‘ā has its own icon', () => {
    expect(MUSAFIR_RULINGS.map((r) => r.id).sort()).toEqual([...MUSAFIR_ICON_IDS.rulings].sort());
    expect(MUSAFIR_DUAS.map((d) => d.id).sort()).toEqual([...MUSAFIR_ICON_IDS.duas].sort());
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
