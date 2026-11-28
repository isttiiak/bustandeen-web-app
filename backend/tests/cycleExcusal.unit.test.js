import { startDayExcused, endDayExcused, excusedPrayersOn } from '../src/utils/cycleExcusal.js';

const set = (s) => [...s].sort();
const P = ['asr', 'dhuhr', 'fajr', 'isha', 'maghrib'];

// The rules and their sources are in GitHub issue 431. These pin the table down.
describe('Rayhanah: prayers excused on the day an episode ends', () => {
  test('became pure after sunrise, before Dhuhr: only Fajr had run out (both schools)', () => {
    for (const school of ['hanafi', 'majority']) {
      expect(set(endDayExcused({ slot: 'morning' }, school))).toEqual(['fajr']);
    }
  });

  test('pure in Dhuhr time with enough time: Fajr excused, Dhuhr owed (both schools)', () => {
    for (const school of ['hanafi', 'majority']) {
      expect(set(endDayExcused({ slot: 'dhuhr', enough: true }, school))).toEqual(['fajr']);
    }
  });

  test('pure in Dhuhr time with too little time: Dhuhr is excused too', () => {
    expect(set(endDayExcused({ slot: 'dhuhr', enough: false }, 'hanafi'))).toEqual([
      'dhuhr',
      'fajr',
    ]);
  });

  test('pure in Asr time with enough time: Hanafi owes only Asr, majority owes Dhuhr and Asr', () => {
    expect(set(endDayExcused({ slot: 'asr', enough: true }, 'hanafi'))).toEqual(['dhuhr', 'fajr']);
    expect(set(endDayExcused({ slot: 'asr', enough: true }, 'majority'))).toEqual(['fajr']);
  });

  test('pure in Asr time with too little time: Asr excused; the majority still do not owe Dhuhr', () => {
    expect(set(endDayExcused({ slot: 'asr', enough: false }, 'majority'))).toEqual([
      'asr',
      'dhuhr',
      'fajr',
    ]);
  });

  test('pure in Isha time with enough time: Hanafi owes Isha only, majority Maghrib and Isha', () => {
    expect(set(endDayExcused({ slot: 'isha', enough: true }, 'hanafi'))).toEqual([
      'asr',
      'dhuhr',
      'fajr',
      'maghrib',
    ]);
    expect(set(endDayExcused({ slot: 'isha', enough: true }, 'majority'))).toEqual([
      'asr',
      'dhuhr',
      'fajr',
    ]);
  });

  test('an unanswered "enough time" keeps the prayer owed', () => {
    expect(set(endDayExcused({ slot: 'dhuhr' }, 'hanafi'))).toEqual(['fajr']);
  });

  test('pure in Fajr time with enough time: nothing is excused', () => {
    expect(set(endDayExcused({ slot: 'fajr', enough: true }, 'majority'))).toEqual([]);
  });
});

describe('Rayhanah: prayers excused on the day an episode starts', () => {
  test('started in Dhuhr time before praying it: Hanafi excuses it, majority only if not enough time passed', () => {
    expect(set(startDayExcused({ slot: 'dhuhr', prayed: false }, 'hanafi'))).toEqual([
      'asr',
      'dhuhr',
      'isha',
      'maghrib',
    ]);
    expect(
      set(startDayExcused({ slot: 'dhuhr', prayed: false, enough: true }, 'majority'))
    ).toEqual(['asr', 'isha', 'maghrib']);
    expect(
      set(startDayExcused({ slot: 'dhuhr', prayed: false, enough: false }, 'majority'))
    ).toEqual(['asr', 'dhuhr', 'isha', 'maghrib']);
  });

  test('started after she prayed that prayer: it stays done, later prayers are excused', () => {
    for (const school of ['hanafi', 'majority']) {
      expect(set(startDayExcused({ slot: 'dhuhr', prayed: true }, school))).toEqual([
        'asr',
        'isha',
        'maghrib',
      ]);
    }
  });

  test('prayers whose time ended before it began are never excused (a missed Fajr is kaza)', () => {
    for (const school of ['hanafi', 'majority']) {
      const out = startDayExcused({ slot: 'asr', prayed: true }, school);
      expect(out.has('fajr')).toBe(false);
      expect(out.has('dhuhr')).toBe(false);
    }
  });

  test('started after sunrise, before Dhuhr: Fajr owed, the rest excused', () => {
    expect(set(startDayExcused({ slot: 'morning' }, 'hanafi'))).toEqual([
      'asr',
      'dhuhr',
      'isha',
      'maghrib',
    ]);
  });

  test('an unanswered majority question keeps the prayer owed', () => {
    expect(set(startDayExcused({ slot: 'asr', prayed: false }, 'majority'))).toEqual([
      'isha',
      'maghrib',
    ]);
  });
});

describe('Rayhanah: an episode day by day', () => {
  const ep = {
    startDate: '2026-11-10',
    endDate: '2026-11-15',
    startMark: { slot: 'asr', prayed: true },
    endMark: { slot: 'dhuhr', enough: true },
  };

  test('days inside are fully excused, outside are not', () => {
    expect(excusedPrayersOn(ep, '2026-11-12', 'hanafi', '2026-12-01').size).toBe(5);
    expect(excusedPrayersOn(ep, '2026-11-09', 'hanafi', '2026-12-01').size).toBe(0);
    expect(excusedPrayersOn(ep, '2026-11-16', 'hanafi', '2026-12-01').size).toBe(0);
  });

  test('start and end days follow their answers', () => {
    expect(set(excusedPrayersOn(ep, '2026-11-10', 'hanafi', '2026-12-01'))).toEqual([
      'isha',
      'maghrib',
    ]);
    expect(set(excusedPrayersOn(ep, '2026-11-15', 'hanafi', '2026-12-01'))).toEqual(['fajr']);
  });

  test('no answer: the whole start and end day stays excused, as before', () => {
    const old = { startDate: '2026-11-10', endDate: '2026-11-15' };
    expect(excusedPrayersOn(old, '2026-11-10', 'majority', '2026-12-01').size).toBe(5);
    expect(excusedPrayersOn(old, '2026-11-15', 'majority', '2026-12-01').size).toBe(5);
  });

  test('an open episode excuses every day up to today, and its start day follows the answer', () => {
    const open = {
      startDate: '2026-11-10',
      endDate: null,
      startMark: { slot: 'fajr', prayed: false },
    };
    expect(excusedPrayersOn(open, '2026-11-11', 'hanafi', '2026-11-20').size).toBe(5);
    expect(excusedPrayersOn(open, '2026-11-21', 'hanafi', '2026-11-20').size).toBe(0);
    expect(set(excusedPrayersOn(open, '2026-11-10', 'hanafi', '2026-11-20'))).toEqual(P);
  });
});
