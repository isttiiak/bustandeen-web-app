import { describe, it, expect } from 'vitest';
import en from '../locales/en/common.json';
import bn from '../locales/bn/common.json';
import page from './QiblaCompass.tsx?raw';
import navbar from '../components/Navbar.tsx?raw';

// T3.2 Qibla: one arch (title + dial), the Kaaba marker and the pointer are
// SVG (no 🕋 or ▲), the copy and every key it uses has no emoji or em dash in
// either language, and nothing hard-codes a colour, glows or animates forever.
const DASH_OR_EMOJI = /—|\p{Extended_Pictographic}|[✓✔▾▲▼●]/u;
const stripComments = (code: string) => code.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

type Tree = { [k: string]: unknown };
const lookup = (dict: unknown, key: string): unknown =>
  key.split('.').reduce<unknown>((node, part) => (node as Tree | undefined)?.[part], dict);

const usedKeys = [
  ...new Set(
    [...page.matchAll(/\bt\(\s*'([a-zA-Z]+\.[a-zA-Z0-9.]+)'/g)].map((m) => m[1] as string)
  ),
];

describe('Qibla screen', () => {
  it('finds the keys', () => {
    expect(usedKeys.length).toBeGreaterThan(10);
  });

  it('renders no emoji or em dash, and draws the Kaaba as SVG', () => {
    const code = stripComments(page);
    expect(code).not.toMatch(DASH_OR_EMOJI);
    expect(code).toMatch(/<KaabaIcon\b/);
  });

  it('has one arch, no hex colour, glow or endless animation', () => {
    const code = stripComments(page);
    expect(code.match(/rounded-arch/g)).toHaveLength(1);
    expect(code).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(code).not.toMatch(
      /shadow-\[0_0_|repeat:\s*Infinity|animate-pulse|blur-3xl|bg-gradient-to-(br|r)\b/
    );
  });

  it('the navbar draws the Qibla, Prayer Times and Musafir icons as SVG', () => {
    expect(navbar).not.toMatch(/🧭|🕐|🧳/u);
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
