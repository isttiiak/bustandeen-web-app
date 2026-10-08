import { describe, it, expect } from 'vitest';
import en from '../locales/en/common.json';
import bn from '../locales/bn/common.json';

// T3.2 Naseeh: the page and its AI cards draw SVG icons only, their copy (and
// every English string they use; Naseeh is English-only) has no emoji or em
// dashes, every key they use exists in English, every full-screen overlay is
// portaled (the page sits in AnimatedBackground's `relative z-10`, under the
// sticky navbar), and nothing hard-codes a colour, glows, floats or animates
// forever (the old aurora badge/panel). One arch hero per screen state.
const files = import.meta.glob<string>(['./NaseehPage.tsx', '../components/ai/*.tsx'], {
  query: '?raw',
  import: 'default',
  eager: true,
});
const DASH_OR_EMOJI = /—|\p{Extended_Pictographic}|[＋✓✔▾]/u;
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

describe('Naseeh screen', () => {
  it('finds the Naseeh files', () => {
    expect(Object.keys(files).length).toBeGreaterThanOrEqual(13);
    expect(usedKeys.length).toBeGreaterThan(80);
  });

  it.each(Object.keys(files))('%s renders no emoji or em dash', (path) => {
    expect(stripComments(files[path] ?? '')).not.toMatch(DASH_OR_EMOJI);
  });

  it.each(Object.keys(files))('%s portals any full-screen overlay', (path) => {
    const code = files[path] ?? '';
    if (/fixed inset-0/.test(code)) expect(code).toMatch(/createPortal\(/);
  });

  it.each(Object.keys(files))(
    '%s has no hex colour, glow, gradient or endless animation',
    (path) => {
      const code = stripComments(files[path] ?? '');
      expect(code).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(code).not.toMatch(/shadow-\[0_0_|repeat:\s*Infinity|blur-2xl|linear-gradient/);
      // The arch hero's own `from-hero` is the one allowed gradient.
      expect(code.replace(/bg-gradient-to-b from-hero to-brand-deep/g, '')).not.toMatch(
        /bg-gradient-to/
      );
    }
  );

  it('draws one arch hero per page state (enabled, disabled)', () => {
    const page = files['./NaseehPage.tsx'] ?? '';
    expect(page.match(/rounded-arch/g)).toHaveLength(1);
    expect(page.match(/<NaseehHero\b/g)).toHaveLength(2);
    const elsewhere = Object.entries(files)
      .filter(([p]) => p !== './NaseehPage.tsx')
      .some(([, code]) => code.includes('rounded-arch'));
    expect(elsewhere).toBe(false);
  });

  it('every key used exists in English, with no emoji or em dash', () => {
    const missing = usedKeys.filter((k) => typeof lookup(en, k) !== 'string');
    const bad = usedKeys.filter((k) => DASH_OR_EMOJI.test(String(lookup(en, k) ?? '')));
    expect({ missing, bad }).toEqual({ missing: [], bad: [] });
  });

  it('the rest-days card (shown in Bangla too) is clean in Bangla', () => {
    const rest = usedKeys.filter((k) => k.startsWith('restDays.'));
    expect(rest.length).toBeGreaterThan(3);
    const bad = rest.filter(
      (k) => typeof lookup(bn, k) !== 'string' || DASH_OR_EMOJI.test(String(lookup(bn, k)))
    );
    expect(bad).toEqual([]);
  });
  it('the AI cards write the account through React Query hooks, not the api client', () => {
    // Data rule: server data goes through hooks/ (the Turn off Naseeh switch
    // used to call api.patch directly and left the profile cache stale).
    for (const [path, code] of Object.entries(files)) {
      expect(code, path).not.toMatch(/\/lib\/api\.js'/);
    }
  });
});
