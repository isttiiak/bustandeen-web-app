import { describe, it, expect } from 'vitest';
import en from '../locales/en/common.json';
import bn from '../locales/bn/common.json';

// T3.2 ConnectFriend + StatusBadges: the invite page is one arch hero with
// shared buttons, the streak/goal capsules (Home, Friends, Zikr counter) take
// their colours from theme tokens, both draw SVG icons only, keep text readable
// (no ink below /70) and every string they use is free of emoji and em dashes
// in en + bn.
const files = import.meta.glob<string>(['./ConnectFriend.tsx', '../components/StatusBadges.tsx'], {
  query: '?raw',
  import: 'default',
  eager: true,
});
const DASH_OR_EMOJI = /—|\p{Extended_Pictographic}|[✓✔→]/u;
const stripComments = (code: string) => code.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

type Tree = { [k: string]: unknown };
const strings = (node: unknown, prefix: string): [string, string][] =>
  typeof node === 'string'
    ? [[prefix, node]]
    : node && typeof node === 'object'
      ? Object.entries(node as Tree).flatMap(([k, v]) => strings(v, `${prefix}.${k}`))
      : [];

describe('ConnectFriend + StatusBadges', () => {
  it('finds both files', () => {
    expect(Object.keys(files)).toHaveLength(2);
  });

  it.each(Object.keys(files))(
    '%s has no emoji, em dash, faint ink, old radius or raw colour',
    (p) => {
      const code = stripComments(files[p]!);
      expect(code).not.toMatch(DASH_OR_EMOJI);
      expect(code).not.toMatch(/text-white\/[1-6]0\b/);
      expect(code).not.toMatch(/bg-white\/|rounded-(xl|2xl|3xl)\b|font-black/);
      expect(code).not.toMatch(/rgba\(|#[0-9a-fA-F]{3,8}\b|red-500|shadow-\[0_0_/);
    }
  );

  it('ConnectFriend is one arch hero with the shared buttons', () => {
    const page = files['./ConnectFriend.tsx']!;
    expect(page.match(/rounded-arch/g)).toHaveLength(1);
    expect(page).toContain('BTN_PRIMARY');
    expect(page).toContain('BTN_SECONDARY');
    expect(page).not.toMatch(/className="btn\b/);
  });

  it('streakVisual returns an SVG icon only (no emoji field)', () => {
    const badges = files['../components/StatusBadges.tsx']!;
    expect(badges).not.toMatch(/\bicon: /);
    expect(badges).toContain('Icon: FireIcon');
  });

  it.each([
    ['en', en],
    ['bn', bn],
  ] as const)('%s: connectFriend + statusBadges copy has no emoji or em dash', (_l, dict) => {
    const bad = (['connectFriend', 'statusBadges'] as const)
      .flatMap((ns) => strings((dict as Tree)[ns], ns))
      .filter(([, v]) => DASH_OR_EMOJI.test(v))
      .map(([k]) => k);
    expect(bad).toEqual([]);
  });
});
