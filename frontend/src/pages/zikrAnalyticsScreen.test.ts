import { describe, it, expect } from 'vitest';
import en from '../locales/en/common.json';
import bn from '../locales/bn/common.json';

// T3.2 Zikr analytics: the page and its streak, goal, trend and time-of-day
// cards use theme cards and the theme's data colours (no hard-coded rgba/hex,
// no glow or gradient bar), draw SVG icons only, keep text readable (no ink
// below /60), and every zikrAnalytics string is free of emoji and em dashes in
// en + bn. Its dialogs (log missed counts, daily goal) are portaled so they
// sit above the navbar.
const files = import.meta.glob<string>(
  [
    './ZikrAnalytics.tsx',
    '../components/zikr/ZikrLogCountsModal.tsx',
    '../components/analytics/StreakCard.tsx',
    '../components/analytics/GoalCard.tsx',
    '../components/analytics/TrendChart.tsx',
    '../components/analytics/TimeOfDayChart.tsx',
  ],
  { query: '?raw', import: 'default', eager: true }
);
const DASH_OR_EMOJI = /—|\p{Extended_Pictographic}|[✓✔→↓]/u;
const stripComments = (code: string) => code.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

type Tree = { [k: string]: unknown };
const strings = (node: unknown, prefix: string): [string, string][] =>
  typeof node === 'string'
    ? [[prefix, node]]
    : node && typeof node === 'object'
      ? Object.entries(node as Tree).flatMap(([k, v]) => strings(v, `${prefix}.${k}`))
      : [];

describe('Zikr analytics screen', () => {
  it.each(Object.keys(files))(
    '%s has no emoji, em dash, faint ink, old radius or raw colour',
    (p) => {
      const code = stripComments(files[p]!);
      expect(code).not.toMatch(DASH_OR_EMOJI);
      expect(code).not.toMatch(/(text|fill)-white\/(10|20|25|30|40|50)\b/);
      expect(code).not.toMatch(/bg-white\/|rounded-(xl|2xl|3xl)\b|shadow-2xl/);
      expect(code).not.toMatch(/rgba\(|#[0-9a-fA-F]{6}\b|boxShadow|bg-gradient/);
    }
  );

  it('uses the shared card, tile and heading classes', () => {
    const page = files['./ZikrAnalytics.tsx']!;
    expect(page).toContain('className={TILE}');
    expect(page).toContain('className={SECTION_TITLE}');
    expect(page).toContain('${CARD} p-4 sm:p-5');
    expect(page).toContain('BTN_PRIMARY');
    expect(page).not.toContain('emoji=');
  });

  it('both dialogs are portaled above the navbar', () => {
    // The goal dialog lives in the page; "Log counts" is shared with Home (U4).
    for (const p of ['./ZikrAnalytics.tsx', '../components/zikr/ZikrLogCountsModal.tsx']) {
      const code = files[p]!;
      expect(code).toMatch(/createPortal\(/);
      expect(code).toMatch(/z-\[70\]/);
      expect(code).not.toContain('modal-open');
    }
    expect(files['./ZikrAnalytics.tsx']).toContain('<ZikrLogCountsModal');
  });

  it('"Log counts" saves through its hook, once per tap or Enter (U4)', () => {
    const modal = stripComments(files['../components/zikr/ZikrLogCountsModal.tsx']!);
    // Through the outbox hook (op id + offline queue), never a raw API call.
    expect(modal).toContain('useLogZikrCounts');
    expect(modal).not.toMatch(/lib\/api|api\.post|fetch\(/);
    // The Enter key path is guarded like the button, so it cannot post twice.
    expect(modal).toMatch(/if \(parsedAmount <= 0 \|\| savingRef\.current\) return;/);
    // ...and stays closed after a save, while the dialog animates out; only a
    // failed save reopens it.
    expect(modal).not.toMatch(/finally \{\s*savingRef\.current = false/);
    expect(modal).toMatch(/catch \{\s*savingRef\.current = false;/);
    // The day choices are pinned to when the form opened.
    expect(modal).toContain('const [openedAt] = useState(');
  });

  it('records are translated, not hard-coded English', () => {
    const page = files['./ZikrAnalytics.tsx']!;
    expect(page).not.toMatch(/'(Sunday|Monday|Friday)'/);
    expect(page).not.toContain('active days`');
  });

  it.each([
    ['en', en],
    ['bn', bn],
  ] as const)('%s: zikrAnalytics copy has no emoji or em dash', (_l, dict) => {
    const bad = strings((dict as Tree).zikrAnalytics, 'zikrAnalytics')
      .filter(([, v]) => DASH_OR_EMOJI.test(v))
      .map(([k]) => k);
    expect(bad).toEqual([]);
  });
});
