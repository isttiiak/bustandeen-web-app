import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { asrBySchool, calcPrayerTimes } from './prayerTimes.js';
import { setAsrMadhab, setCalcMethod } from './salatPrefs.js';

// FIQH-01: the onboarding madhab step shows today's ʿAṣr under both schools.
class MemoryStorage {
  private map = new Map<string, string>();
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, String(v));
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  clear() {
    this.map.clear();
  }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', new MemoryStorage());
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const DHAKA = { lat: 23.8103, lng: 90.4125 };
const DAY = new Date('2026-10-09T12:00:00+06:00');

beforeEach(() => {
  setCalcMethod('Karachi');
});

describe('asrBySchool', () => {
  it('matches calcPrayerTimes for each saved school', () => {
    const both = asrBySchool(DHAKA.lat, DHAKA.lng, DAY);
    setAsrMadhab('standard');
    expect(both.standard.getTime()).toBe(calcPrayerTimes(DHAKA.lat, DHAKA.lng, DAY).asr.getTime());
    setAsrMadhab('hanafi');
    expect(both.hanafi.getTime()).toBe(calcPrayerTimes(DHAKA.lat, DHAKA.lng, DAY).asr.getTime());
  });

  it('puts Ḥanafī ʿAṣr later, by a plausible margin, whatever is saved', () => {
    setAsrMadhab('hanafi');
    const { standard, hanafi } = asrBySchool(DHAKA.lat, DHAKA.lng, DAY);
    const minutes = (hanafi.getTime() - standard.getTime()) / 60_000;
    expect(minutes).toBeGreaterThan(30);
    expect(minutes).toBeLessThan(90);
  });
});

describe('asrBySchool with a method preview', () => {
  it('uses the given method without saving it', () => {
    // ʿAṣr depends only on the shadow factor, so the method must not move it.
    const karachi = asrBySchool(DHAKA.lat, DHAKA.lng, DAY, 'Karachi');
    const mwl = asrBySchool(DHAKA.lat, DHAKA.lng, DAY, 'MuslimWorldLeague');
    expect(Math.abs(mwl.hanafi.getTime() - karachi.hanafi.getTime())).toBeLessThan(2 * 60_000);
    expect(localStorage.getItem('bustandeen_calc_method')).toBe('Karachi');
  });
});
