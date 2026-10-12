import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getHijriDate,
  HIJRI_COUNTRY_KEY,
  HIJRI_INPUTS_EVENT,
  MOON_SIGHTING_KEY,
  writeHijriInput,
} from './islamicCalendar.js';
import { MemoryStorage } from '../test/memoryStorage.js';

// 12 Oct 2026: the BD record "Jumādā al-Ūlā 1448 began 13 Oct" was live, but
// screens kept 1 Jumādā al-Ūlā (Umm al-Qura) until a reload, because the date
// is read during render and nothing redrew it when the record arrived.
const BD_JUMADA_I = [{ country: 'BD', hijriYear: 1448, hijriMonth: 5, startDate: '2026-10-13' }];

let store: MemoryStorage;
let events: number;
beforeEach(() => {
  store = new MemoryStorage();
  vi.stubGlobal('localStorage', store);
  const target = new EventTarget();
  events = 0;
  target.addEventListener(HIJRI_INPUTS_EVENT, () => events++);
  vi.stubGlobal('window', target);
});
afterEach(() => vi.unstubAllGlobals());

describe('writeHijriInput', () => {
  it('stores the value and fires the change event', () => {
    expect(writeHijriInput(MOON_SIGHTING_KEY, JSON.stringify(BD_JUMADA_I))).toBe(true);
    expect(store.getItem(MOON_SIGHTING_KEY)).toBe(JSON.stringify(BD_JUMADA_I));
    expect(events).toBe(1);
  });

  it('does nothing when the value is unchanged (no redraw on every refetch)', () => {
    writeHijriInput(HIJRI_COUNTRY_KEY, 'BD');
    expect(writeHijriInput(HIJRI_COUNTRY_KEY, 'BD')).toBe(false);
    expect(events).toBe(1);
  });

  it('null removes the value and fires once; removing again is a no-op', () => {
    writeHijriInput(HIJRI_COUNTRY_KEY, 'BD');
    expect(writeHijriInput(HIJRI_COUNTRY_KEY, null)).toBe(true);
    expect(store.getItem(HIJRI_COUNTRY_KEY)).toBeNull();
    expect(writeHijriInput(HIJRI_COUNTRY_KEY, null)).toBe(false);
    expect(events).toBe(2);
  });

  it('the next read after the event gives the committee date', () => {
    store.setItem('bustandeen_hijri_manual', '0');
    writeHijriInput(HIJRI_COUNTRY_KEY, 'BD');
    const noon = new Date('2026-10-12T12:00:00+06:00');
    expect(getHijriDate(noon)).toMatchObject({ month: 5, day: 1 }); // Umm al-Qura
    writeHijriInput(MOON_SIGHTING_KEY, JSON.stringify(BD_JUMADA_I));
    expect(getHijriDate(noon)).toMatchObject({ month: 4, day: 30 });
    expect(getHijriDate(new Date('2026-10-13T12:00:00+06:00'))).toMatchObject({
      month: 5,
      day: 1,
    });
  });
});
