import { computeDayNoor, weekStartFriday } from '../src/services/noor.service.js';

const day = (over = {}) => ({
  salatDone: 0,
  zikr: 0,
  zikrGoal: 100,
  quran: 0,
  quranGoal: 20,
  fasted: false,
  nafl: false,
  hifz: false,
  salawat: false,
  excused: false,
  ...over,
});

describe('Noor v2 daily score', () => {
  test('a day with nothing done is 0, even with a long streak behind it', () => {
    expect(computeDayNoor(day(), 40).score).toBe(0);
  });

  test('a long streak gives no head start: only counts once something is done today', () => {
    const r = computeDayNoor(day({ salatDone: 1 }), 40);
    expect(r.base).toBe(10);
    expect(r.score).toBe(20); // 10 for the prayer + capped 10 steadiness
  });

  test('prayers are 50 of the 100 and never pro-rated by the clock', () => {
    expect(computeDayNoor(day({ salatDone: 5 }), 1).base).toBe(50);
  });

  test('100 is reachable without fasting (nafl + hifz fill the extras)', () => {
    const r = computeDayNoor(
      day({ salatDone: 5, zikr: 500, quran: 50, nafl: true, hifz: true }),
      12
    );
    expect(r.score).toBe(100);
  });

  test('extras cap at two (10 points)', () => {
    const r = computeDayNoor(day({ fasted: true, nafl: true, hifz: true, salawat: true }), 1);
    expect(r.base).toBe(10);
  });

  test("zikr and quran are proportional to the user's own goal and capped", () => {
    expect(computeDayNoor(day({ zikr: 50 }), 1).base).toBe(8); // 0.5 * 15 rounded
    expect(computeDayNoor(day({ zikr: 5000 }), 1).base).toBe(15);
    expect(computeDayNoor(day({ quran: 10 }), 1).base).toBe(8);
  });

  test('excused day redistributes prayer weight to zikr and quran, max 100', () => {
    const r = computeDayNoor(
      day({ excused: true, zikr: 100, quran: 20, salawat: true, hifz: true }),
      10
    );
    expect(r.score).toBe(100);
    // prayers are ignored while excused
    expect(computeDayNoor(day({ excused: true, salatDone: 5 }), 1).score).toBe(0);
  });

  test('steadiness grows with the active run, 1 per day', () => {
    const base = day({ zikr: 100 });
    expect(computeDayNoor(base, 1).score).toBe(16);
    expect(computeDayNoor(base, 4).score).toBe(19);
  });

  test('week starts on Friday', () => {
    expect(weekStartFriday('2026-09-18')).toBe('2026-09-18'); // Friday
    expect(weekStartFriday('2026-09-20')).toBe('2026-09-18'); // Sunday
    expect(weekStartFriday('2026-09-24')).toBe('2026-09-18'); // Thursday
    expect(weekStartFriday('2026-09-25')).toBe('2026-09-25'); // next Friday
  });
});
