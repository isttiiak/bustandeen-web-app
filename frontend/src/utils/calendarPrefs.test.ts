import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryStorage } from '../test/memoryStorage.js';
import {
  CALENDAR_PREF_KEYS,
  defaultWeek,
  parseLayers,
  readCalendarPrefs,
  writeCalendarPrefs,
} from './calendarPrefs.js';

beforeEach(() => {
  vi.stubGlobal('localStorage', new MemoryStorage());
});

describe('defaults', () => {
  it('English and Hijri, English grid, every kind of event', () => {
    expect(readCalendarPrefs('BD')).toEqual({
      layers: ['greg', 'hijri'],
      grid: 'greg',
      weekStart: 6,
      weekend: [5, 6],
      show: { islamic: true, holidays: true, national: true },
    });
  });

  it('week by country: Bangladesh is set here, others from the locale data', () => {
    expect(defaultWeek('BD')).toEqual({ weekStart: 6, weekend: [5, 6] });
    expect(defaultWeek('SA').weekend).toEqual([5, 6]);
    expect(defaultWeek('IR').weekend).toEqual([5]);
    expect(defaultWeek('GB')).toEqual({ weekStart: 1, weekend: [6, 0] });
    const none = defaultWeek(null);
    expect(none.weekStart).toBeGreaterThanOrEqual(0);
    expect(none.weekend.length).toBeGreaterThan(0);
  });
});

describe('stored settings', () => {
  it('round trip', () => {
    writeCalendarPrefs({
      layers: ['hijri', 'greg', 'bn'],
      grid: 'hijri',
      weekStart: 0,
      weekend: [6, 0],
      show: { islamic: true, holidays: false, national: true },
    });
    expect(readCalendarPrefs('BD')).toEqual({
      layers: ['hijri', 'greg', 'bn'],
      grid: 'hijri',
      weekStart: 0,
      weekend: [0, 6],
      show: { islamic: true, holidays: false, national: true },
    });
  });

  it('no weekend at all is a valid choice', () => {
    writeCalendarPrefs({ weekend: [] });
    expect(readCalendarPrefs('BD').weekend).toEqual([]);
  });

  it('bad values fall back to the defaults, and at least one calendar stays', () => {
    expect(parseLayers('')).toEqual(['greg', 'hijri']);
    expect(parseLayers('moon,bn,bn')).toEqual(['bn']);
    localStorage.setItem('bustandeen_calendar_grid', 'bn');
    localStorage.setItem('bustandeen_calendar_week_start', '9');
    localStorage.setItem('bustandeen_calendar_weekend', 'x');
    const p = readCalendarPrefs('BD');
    expect(p.grid).toBe('greg');
    expect(p.weekStart).toBe(6);
    expect(p.weekend).toEqual([5, 6]);
  });

  it('the Bengali calendar alone still gives an English grid', () => {
    writeCalendarPrefs({ layers: ['bn'] });
    expect(readCalendarPrefs(null).grid).toBe('greg');
  });
});

describe('cross-device sync', () => {
  // A key syncs only when it is in BOTH lists (prefsSync.ts header).
  const keysIn = (path: string, list: string) => {
    const src = readFileSync(new URL(path, import.meta.url), 'utf8');
    const start = src.indexOf(list) + list.length;
    const block = src.slice(start, src.indexOf(']', start));
    return new Set(block.match(/'bustandeen_[a-z0-9_]+'/g));
  };
  const front = keysIn('./prefsSync.ts', 'SYNCED_KEYS: readonly string[] = [');
  const back = keysIn(
    '../../../backend/src/services/userPrefs.service.ts',
    'SYNCED_PREF_KEYS: ReadonlySet<string> = new Set(['
  );

  it('the calendar settings sync', () => {
    for (const key of CALENDAR_PREF_KEYS) {
      expect(front, key).toContain(`'${key}'`);
      expect(back, key).toContain(`'${key}'`);
    }
  });

  it('the frontend and backend lists match', () => {
    expect([...front].sort()).toEqual([...back].sort());
  });
});
