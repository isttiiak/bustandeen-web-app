import { describe, expect, it } from 'vitest';
import { getDemoResponse } from './demoData.js';

// The demo answers the kaza debt writes with the whole debt, like the server: the
// Salat tracker puts the answer straight into its cache, so a bare { ok: true }
// broke the page after any edit (found in audit P4-1, PR 16).

type Debt = { ok: boolean; owed: Record<string, number>; totalOwed: number; since: string };
const get = () => getDemoResponse('/api/salat/debt?today=2026-10-15', 'get') as Debt;
const write = (path: string, method: string, body: unknown) =>
  getDemoResponse(`/api/salat/debt/${path}`, method, 'male', JSON.stringify(body)) as Debt;

describe('the demo kaza debt', () => {
  it('starts with a small debt', () => {
    expect(get()).toMatchObject({
      ok: true,
      owed: { fajr: 1, dhuhr: 1, asr: 1, maghrib: 0, isha: 1 },
      totalOwed: 4,
    });
  });

  it('a set answers with the whole debt, clamped to 0..9999, and is kept', () => {
    const after = write('set', 'patch', { prayer: 'asr', count: 12000 });
    expect(after.owed.asr).toBe(9999);
    expect(after.totalOwed).toBe(10002);
    expect(get().owed.asr).toBe(9999);
    expect(write('set', 'patch', { prayer: 'asr', count: -3 }).owed.asr).toBe(0);
  });

  it('an adjust moves one count and never goes below 0', () => {
    expect(write('adjust', 'patch', { prayer: 'fajr', delta: 2 }).owed.fajr).toBe(3);
    expect(write('adjust', 'patch', { prayer: 'maghrib', delta: -1 }).owed.maghrib).toBe(0);
  });

  it('a reset zeroes every count and starts from the given day', () => {
    const after = write('reset', 'post', { today: '2026-10-15' });
    expect(after.totalOwed).toBe(0);
    expect(after.since).toBe('2026-10-15');
    expect(get().totalOwed).toBe(0);
  });
});

describe('the demo Quran bookmarks', () => {
  type Summary = { bookmarks: Array<{ surah: number; ayah: number }> };
  const summary = () => getDemoResponse('/api/quran/summary', 'get') as Summary;
  const toggle = (surah: number, ayah: number) =>
    getDemoResponse('/api/quran/bookmark', 'post', 'male', JSON.stringify({ surah, ayah })) as {
      ok: boolean;
      bookmarks: Summary['bookmarks'];
    };

  it('a toggle adds the ayah (newest first), the summary shows it, a second toggle removes it', () => {
    expect(summary().bookmarks).toEqual([]);
    toggle(1, 1);
    expect(toggle(2, 255).bookmarks).toEqual([
      { surah: 2, ayah: 255 },
      { surah: 1, ayah: 1 },
    ]);
    expect(summary().bookmarks).toHaveLength(2);
    expect(toggle(1, 1).bookmarks).toEqual([{ surah: 2, ayah: 255 }]);
    toggle(2, 255);
    expect(summary().bookmarks).toEqual([]);
  });
});
