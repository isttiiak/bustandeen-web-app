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
