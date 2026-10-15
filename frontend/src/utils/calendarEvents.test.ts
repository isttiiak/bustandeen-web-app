import { describe, expect, it } from 'vitest';
import { addDays } from './hijriOffset.js';
import { calendarDays, type HijriInputs } from './calendarMonth.js';
import {
  dayEvents,
  holidayYears,
  isHoliday,
  upcomingEvents,
  type CalendarEvent,
  type EventFilters,
} from './calendarEvents.js';

const BD_INPUTS: HijriInputs = {
  manual: false,
  userOffset: 0,
  country: 'BD',
  records: [
    {
      id: 'bd-1448-5',
      country: 'BD',
      hijriYear: 1448,
      hijriMonth: 5,
      startDate: '2026-10-13',
      effectiveFrom: '2026-10-12',
      offset: -1,
      note: 'fixture',
    },
  ],
};
const ALL: EventFilters = { country: 'BD', islamic: true, holidays: true, national: true };
const day = calendarDays(BD_INPUTS);

const label = (e: CalendarEvent) =>
  e.type === 'islamic' ? e.id : e.type === 'holiday' ? `hol:${e.holiday.en}` : `nat:${e.day.en}`;
const on = (ymd: string, f: EventFilters = ALL) => dayEvents(day(ymd), f).map(label);

describe('dayEvents', () => {
  it('a government holiday', () => {
    expect(on('2026-10-21')).toEqual(['hol:Durga Puja (Bijoya Dashami)']);
    expect(isHoliday(dayEvents(day('2026-10-21'), ALL))).toBe(true);
  });

  it('White Days in Bangladesh: 13-15 Jumada al-Ula = 25-27 Oct 2026', () => {
    expect(on('2026-10-24')).toEqual([]);
    expect(on('2026-10-25')).toEqual(['ayyam_al_bid']);
    expect(on('2026-10-27')).toEqual(['ayyam_al_bid']);
    expect(on('2026-10-28')).toEqual([]);
  });

  it('a national day that is not a holiday', () => {
    expect(on('2026-12-14')).toEqual(["nat:Martyred Intellectuals' Day"]);
    expect(isHoliday(dayEvents(day('2026-12-14'), ALL))).toBe(false);
  });

  it('Islamic first, then the holiday, then the national day', () => {
    // Rajab 1448 begins 11 Dec in Bangladesh: 16 Dec = 6 Rajab, 25 Dec = 15 Rajab
    expect(on('2026-12-16')).toEqual(['hol:Victory Day']);
    expect(on('2026-12-25')).toEqual(['ayyam_al_bid', 'hol:Christmas Day']);
    expect(on('2026-12-23')).toEqual(['ayyam_al_bid']);
  });

  it('Fridays and Monday/Thursday fasts are not events (the grid shades the weekend)', () => {
    expect(on('2026-10-16')).toEqual([]); // Friday
    expect(on('2026-10-19')).toEqual([]); // Monday
  });

  it('the filters', () => {
    expect(on('2026-10-21', { ...ALL, holidays: false })).toEqual([]);
    expect(on('2026-10-25', { ...ALL, islamic: false })).toEqual([]);
    expect(on('2026-12-14', { ...ALL, national: false })).toEqual([]);
    // No holidays without a country, or for a country without a curated list
    expect(on('2026-10-21', { ...ALL, country: null })).toEqual([]);
    expect(on('2026-10-21', { ...ALL, country: 'GB' })).toEqual([]);
  });

  it('a day with two holidays keeps both (20 Mar 2026, as listed)', () => {
    expect(on('2026-03-20').filter((l) => l.startsWith('hol:'))).toHaveLength(2);
  });

  it('years with a holiday list', () => {
    expect(holidayYears('BD')).toEqual([2026]);
    expect(holidayYears('GB')).toEqual([]);
    expect(holidayYears(null)).toEqual([]);
  });
});

describe('upcomingEvents (next 30 days)', () => {
  const next = (from: string, n = 30) =>
    Array.from({ length: n }, (_, i) => day(addDays(from, i + 1)));

  it('from 15 Oct 2026: the Durga Puja days and Armed Forces Day, no White Days', () => {
    const list = upcomingEvents(next('2026-10-15', 40), ALL).map(
      (x) => `${x.day.ymd} ${label(x.event)}`
    );
    expect(list).toEqual([
      '2026-10-20 hol:Durga Puja (Mahanabami)',
      '2026-10-21 hol:Durga Puja (Bijoya Dashami)',
      '2026-10-22 hol:Durga Puja holiday',
      '2026-11-21 nat:Armed Forces Day',
    ]);
  });

  it('the first ten days of Dhul Hijjah count once, on the 1st', () => {
    // Umm al-Qura 1 Dhul Hijjah 1448 = 7 May 2027; with the BD record's shift, 8 May
    const list = upcomingEvents(next('2027-05-01', 20), {
      ...ALL,
      holidays: false,
      national: false,
    });
    const ids = list.map((x) => (x.event.type === 'islamic' ? x.event.id : ''));
    expect(ids.filter((id) => id === 'dhul_hijjah_first10')).toHaveLength(1);
    expect(ids).toContain('arafah');
    expect(ids).toContain('eid_adha');
  });
});
