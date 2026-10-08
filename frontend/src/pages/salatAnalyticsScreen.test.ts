import { describe, it, expect } from 'vitest';
import en from '../locales/en/common.json';
import bn from '../locales/bn/common.json';

// T3.2 Salat analytics: the page, its two charts and the shared chart-info
// dialog use theme cards and the theme's data colours (no hard-coded rgba/hex,
// no glow), draw SVG icons only, keep text readable (no ink below /60), and
// every salatAnalytics string is free of emoji and em dashes in en + bn. The
// info dialog is portaled so it sits above the navbar.
const files = import.meta.glob<string>(
  [
    './SalatAnalytics.tsx',
    '../components/ChartInfoModal.tsx',
    '../components/analytics/KazaDebtChart.tsx',
    '../components/analytics/MosqueTrendChart.tsx',
  ],
  { query: '?raw', import: 'default', eager: true }
);
const DASH_OR_EMOJI = /—|\p{Extended_Pictographic}|[✓✔→]/u;
const stripComments = (code: string) => code.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

type Tree = { [k: string]: unknown };
const strings = (node: unknown, prefix: string): [string, string][] =>
  typeof node === 'string'
    ? [[prefix, node]]
    : node && typeof node === 'object'
      ? Object.entries(node as Tree).flatMap(([k, v]) => strings(v, `${prefix}.${k}`))
      : [];

describe('Salat analytics screen', () => {
  it.each(Object.keys(files))(
    '%s has no emoji, em dash, faint ink, old radius or raw colour',
    (p) => {
      const code = stripComments(files[p]!);
      expect(code).not.toMatch(DASH_OR_EMOJI);
      expect(code).not.toMatch(/(text|fill)-white\/(10|20|25|30|40|50)\b/);
      expect(code).not.toMatch(/bg-white\/|rounded-(xl|2xl|3xl)\b|shadow-2xl/);
      expect(code).not.toMatch(/rgba\(|#[0-9a-fA-F]{6}\b|boxShadow/);
    }
  );

  it('uses the shared card, tile and heading classes', () => {
    const page = files['./SalatAnalytics.tsx']!;
    expect(page).toContain('className={CARD}');
    expect(page).toContain('className={TILE}');
    expect(page).toContain('className={SECTION_TITLE}');
    expect(page).toContain('calendarCellClass(');
    expect(page).not.toContain('emoji=');
  });

  it('the chart info dialog is portaled above the navbar', () => {
    const modal = files['../components/ChartInfoModal.tsx']!;
    expect(modal).toContain('createPortal(');
    expect(modal).toContain('z-[70]');
  });

  it.each([
    ['en', en],
    ['bn', bn],
  ] as const)('%s: salatAnalytics copy has no emoji or em dash', (_l, dict) => {
    const bad = strings((dict as Tree).salatAnalytics, 'salatAnalytics')
      .filter(([, v]) => DASH_OR_EMOJI.test(v))
      .map(([k]) => k);
    expect(bad).toEqual([]);
  });
});
