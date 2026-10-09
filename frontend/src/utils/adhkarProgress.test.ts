import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryStorage } from '../test/memoryStorage.js';
import {
  completeItem,
  doneCount,
  firstOpenIndex,
  readAdhkarCounts,
  readAdhkarSummary,
  reopenItem,
  tapItem,
  writeAdhkarCounts,
} from './adhkarProgress.js';
import { EVENING_ADHKAR, MORNING_ADHKAR } from '../seo/content/adhkar.js';

const items = [
  { id: 'a', repeat: 1 },
  { id: 'b', repeat: 3 },
  { id: 'c', repeat: 100 },
];

describe('adhkar routine progress (T4.3)', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', new MemoryStorage());
  });

  it('taps up to the count and never past it', () => {
    let c = {};
    c = tapItem(items[1], c);
    c = tapItem(items[1], c);
    c = tapItem(items[1], c);
    c = tapItem(items[1], c);
    expect(c).toEqual({ b: 3 });
  });

  it('finds the first open item, and -1 when all are done', () => {
    expect(firstOpenIndex(items, {})).toBe(0);
    expect(firstOpenIndex(items, { a: 1 })).toBe(1);
    expect(firstOpenIndex(items, { a: 1, b: 3, c: 100 })).toBe(-1);
    expect(doneCount(items, { a: 1, b: 2 })).toBe(1);
  });

  it('Next completes the item, Back reopens the one before', () => {
    expect(completeItem(items[2], { a: 1 })).toEqual({ a: 1, c: 100 });
    expect(reopenItem(items[0], { a: 1, b: 3 })).toEqual({ a: 0, b: 3 });
  });

  it('keeps counts per tracking day and period, with a summary for Home', () => {
    writeAdhkarCounts('2026-10-10', 'morning', { a: 1, b: 1 }, items);
    writeAdhkarCounts('2026-10-10', 'evening', { a: 1 }, items);
    expect(readAdhkarCounts('2026-10-10', 'morning')).toEqual({ a: 1, b: 1 });
    expect(readAdhkarCounts('2026-10-10', 'evening')).toEqual({ a: 1 });
    expect(readAdhkarSummary('2026-10-10', 'morning')).toEqual({ done: 1, total: 3 });
    // A new tracking day starts from zero and drops yesterday's counts.
    expect(readAdhkarCounts('2026-10-11', 'morning')).toEqual({});
    expect(readAdhkarSummary('2026-10-11', 'morning')).toBeNull();
    writeAdhkarCounts('2026-10-11', 'morning', { a: 1 }, items);
    expect(readAdhkarCounts('2026-10-11', 'evening')).toEqual({});
  });

  it('survives unreadable storage', () => {
    localStorage.setItem('bustandeen_adhkar_progress', '{not json');
    expect(readAdhkarCounts('2026-10-10', 'morning')).toEqual({});
  });
});

describe('adhkar content', () => {
  const all = [...MORNING_ADHKAR, ...EVENING_ADHKAR];

  it('every hadith source names its number and links to sunnah.com, never a weak grade', () => {
    for (const i of all.filter((x) => x.reference.grade !== 'Quran')) {
      expect(i.reference.text, i.id).toMatch(/\d/);
      expect(i.reference.url, i.id).toMatch(/^https:\/\/sunnah\.com\//);
      expect(i.reference.grade, i.id).toMatch(/^(Ṣaḥīḥ|Ḥasan)$/);
    }
  });

  it('Quran items come from the Tanzil text, not a retyped string', () => {
    for (const i of all.filter((x) => x.reference.grade === 'Quran' || x.id === 'three-quls')) {
      expect(i.quran?.length, i.id).toBeGreaterThan(0);
    }
  });

  it('dropped "Raditu billahi Rabba" (Abu Dawud 5072 is graded Da\'if on sunnah.com)', () => {
    expect(all.some((i) => i.reference.url.includes('abudawud:5072'))).toBe(false);
  });

  it('ids are unique within each routine and counts are positive', () => {
    for (const list of [MORNING_ADHKAR, EVENING_ADHKAR]) {
      expect(new Set(list.map((i) => i.id)).size).toBe(list.length);
      for (const i of list) expect(i.repeat).toBeGreaterThan(0);
    }
  });
});
