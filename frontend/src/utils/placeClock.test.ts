import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addDaysYmd,
  deviceYmd,
  deviceZone,
  dismissZoneMismatch,
  foreignPlaceZone,
  loadZoneLookup,
  placeOffsetMin,
  placeShortName,
  placeToday,
  placeYmd,
  placeZone,
  readSavedPlace,
  resetZoneLookupForTests,
  weekdayOfYmd,
  ymdNoon,
  zoneMismatch,
  zoneOffsetMin,
} from './placeClock.js';
import { formatTime } from './prayerTimes.js';
import { MemoryStorage } from '../test/memoryStorage.js';

const DHAKA = { latitude: 23.81, longitude: 90.41, name: 'Dhaka, Bangladesh' };
const APIA = { latitude: -13.83, longitude: -171.76, name: 'Apia, Samoa' };

let prevTz: string | undefined;
beforeAll(() => {
  prevTz = process.env.TZ;
});
afterAll(() => {
  process.env.TZ = prevTz;
});
let store: MemoryStorage;
beforeEach(() => {
  store = new MemoryStorage();
  vi.stubGlobal('localStorage', store);
  resetZoneLookupForTests();
});
afterEach(() => {
  vi.unstubAllGlobals();
  resetZoneLookupForTests();
});

const save = (loc: object) => store.setItem('bustandeen_location', JSON.stringify(loc));

describe('calendar helpers', () => {
  it('adds calendar days without DST or zone effects', () => {
    process.env.TZ = 'Europe/London';
    expect(addDaysYmd('2026-03-28', 1)).toBe('2026-03-29');
    expect(addDaysYmd('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDaysYmd('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('reads weekdays and noon of a date', () => {
    expect(weekdayOfYmd('2026-10-16')).toBe(5); // a Friday
    process.env.TZ = 'Pacific/Apia';
    expect(deviceYmd(ymdNoon('2026-10-16'))).toBe('2026-10-16');
  });
});

describe('zone offsets', () => {
  it('reads an IANA zone offset at an instant, with DST', () => {
    expect(zoneOffsetMin('Asia/Dhaka', new Date('2026-10-12T00:00:00Z'))).toBe(360);
    expect(zoneOffsetMin('Europe/London', new Date('2026-06-21T00:00:00Z'))).toBe(60);
    expect(zoneOffsetMin('Europe/London', new Date('2026-12-21T00:00:00Z'))).toBe(0);
    expect(zoneOffsetMin('Asia/Kolkata', new Date('2026-12-21T00:00:00Z'))).toBe(330);
    expect(zoneOffsetMin('Pacific/Apia', new Date('2026-12-21T00:00:00Z'))).toBe(780);
  });

  it('is null for a zone the browser does not know, or an invalid date', () => {
    expect(zoneOffsetMin('Mars/Olympus_Mons', new Date())).toBeNull();
    expect(zoneOffsetMin('Asia/Dhaka', new Date(NaN))).toBeNull();
  });
});

describe('before the zone map has loaded (estimate)', () => {
  it('shares the phone zone within 3 h of the longitude', () => {
    process.env.TZ = 'Europe/Madrid';
    // Madrid's clock is 2 h ahead of its longitude in summer.
    expect(placeOffsetMin(40.42, -3.7, new Date('2026-06-21T12:00:00Z'))).toBe(120);
  });

  it('uses the longitude further away', () => {
    process.env.TZ = 'Europe/London';
    expect(placeOffsetMin(23.81, 90.41, new Date('2026-10-12T00:00:00Z'))).toBe(360);
  });

  it('counts round the clock across the date line (a phone in Samoa, Samoa saved)', () => {
    process.env.TZ = 'Pacific/Apia';
    const at = new Date('2026-10-11T22:00:00Z'); // 11:00 on 12 Oct in Apia
    expect(placeYmd(APIA.latitude, APIA.longitude, at)).toBe('2026-10-12');
  });

  it('has no exact zone yet', () => {
    expect(placeZone(DHAKA.latitude, DHAKA.longitude)).toBeNull();
  });
});

describe('with the zone map', () => {
  beforeEach(async () => {
    await loadZoneLookup();
  });

  it('finds the exact zone and remembers it for the next start', () => {
    expect(placeZone(APIA.latitude, APIA.longitude)).toBe('Pacific/Apia');
    resetZoneLookupForTests();
    // Cached for these coordinates only.
    expect(placeZone(APIA.latitude, APIA.longitude)).toBe('Pacific/Apia');
    expect(placeZone(DHAKA.latitude, DHAKA.longitude)).toBeNull();
  });

  it('dates the date line right from far away', () => {
    process.env.TZ = 'Asia/Dhaka';
    const at = new Date('2026-10-11T22:00:00Z');
    expect(placeYmd(APIA.latitude, APIA.longitude, at)).toBe('2026-10-12');
  });

  it('falls back to the estimate for impossible coordinates', () => {
    process.env.TZ = 'Asia/Dhaka';
    expect(placeZone(123, 456)).toBeNull();
  });

  it('loads once and can be called again', async () => {
    await expect(loadZoneLookup()).resolves.toBeUndefined();
  });
});

describe('the saved place', () => {
  it('reads a valid saved location only', () => {
    expect(readSavedPlace()).toBeNull();
    store.setItem('bustandeen_location', '{bad');
    expect(readSavedPlace()).toBeNull();
    save({ latitude: NaN, longitude: 1 });
    expect(readSavedPlace()).toBeNull();
    save({ latitude: '1', longitude: 1 });
    expect(readSavedPlace()).toBeNull();
    save(DHAKA);
    expect(readSavedPlace()).toEqual(DHAKA);
  });

  it("today is the place's date, the phone's without one", () => {
    process.env.TZ = 'Europe/London';
    const at = new Date('2026-10-11T20:00:00Z'); // 21:00 London, 02:00 Dhaka on the 12th
    expect(placeToday(at)).toBe('2026-10-11');
    save(DHAKA);
    expect(placeToday(at)).toBe('2026-10-12');
  });

  it('short name: city from the saved name, else from the zone', () => {
    expect(placeShortName(DHAKA, 'Asia/Dhaka')).toBe('Dhaka');
    expect(placeShortName({ latitude: 0, longitude: 0 }, 'America/Los_Angeles')).toBe(
      'Los Angeles'
    );
    expect(placeShortName(null, null)).toBe('');
  });

  it('knows the phone zone', () => {
    process.env.TZ = 'Asia/Dhaka';
    expect(deviceZone()).toBe('Asia/Dhaka');
  });
});

describe('phone on another zone than the saved place', () => {
  beforeEach(async () => {
    await loadZoneLookup();
  });
  const at = new Date('2026-10-11T22:39:00Z'); // 04:39 Dhaka, 23:39 London

  it('no card when the clocks agree, or without a location', () => {
    process.env.TZ = 'Asia/Dhaka';
    expect(foreignPlaceZone(at)).toBeNull();
    save(DHAKA);
    expect(foreignPlaceZone(at)).toBeNull();
    expect(zoneMismatch(at)).toBeNull();
  });

  it('shows the card until this pair of zones is dismissed', () => {
    process.env.TZ = 'Europe/London';
    save(DHAKA);
    expect(foreignPlaceZone(at)).toBe('Asia/Dhaka');
    const m = zoneMismatch(at)!;
    expect(m).toEqual({ zone: 'Asia/Dhaka', key: 'Europe/London|Asia/Dhaka' });
    dismissZoneMismatch(m.key);
    expect(zoneMismatch(at)).toBeNull();
    // A new trip (another phone zone) asks again.
    process.env.TZ = 'America/New_York';
    expect(zoneMismatch(at)).toEqual({ zone: 'Asia/Dhaka', key: 'America/New_York|Asia/Dhaka' });
  });

  it("prayer times are shown on the place's clock", () => {
    process.env.TZ = 'Europe/London';
    save(DHAKA);
    expect(formatTime(at)).toMatch(/^04:39\sAM$/);
    store.removeItem('bustandeen_location');
    expect(formatTime(at)).toMatch(/^11:39\sPM$/);
  });
});
