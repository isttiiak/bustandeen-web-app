import { describe, expect, it } from 'vitest';
import { SPECIAL_DAYS } from './islamicCalendar.js';
import {
  NIGHT_SPECIAL_DAYS,
  RECURRING_SPECIAL_DAYS,
  specialDayIds,
  type SpecialDayId,
} from './specialDayRules.js';

const h = (month: number, day: number) => ({ month, day });
const WED = 3;

describe('specialDayIds: the rules behind getTodaySpecialDays', () => {
  it.each<[string, { month: number; day: number } | null, number, SpecialDayId[]]>([
    ['Friday', null, 5, ['friday']],
    ['Monday', null, 1, ['fast_mon_thu']],
    ['Thursday', null, 4, ['fast_mon_thu']],
    ['an ordinary Wednesday', h(5, 3), WED, []],
    ['Ayyam al-Bid, 13th', h(5, 13), WED, ['ayyam_al_bid']],
    ['Ayyam al-Bid, 15th', h(5, 15), WED, ['ayyam_al_bid']],
    ['not the 16th', h(5, 16), WED, []],
    ['1 Muharram', h(1, 1), WED, ['islamic_new_year']],
    ['9 Muharram', h(1, 9), WED, ['ashura']],
    ['10 Muharram', h(1, 10), WED, ['ashura']],
    ['14 Shaban (also a White Day)', h(8, 14), WED, ['ayyam_al_bid', 'shab_e_barat']],
    ['21 Ramadan', h(9, 21), WED, ['laylat_qadr']],
    ['22 Ramadan (even night)', h(9, 22), WED, []],
    ['29 Ramadan', h(9, 29), WED, ['laylat_qadr']],
    ['1 Shawwal', h(10, 1), WED, ['eid_fitr']],
    ['1 Dhul Hijjah', h(12, 1), WED, ['dhul_hijjah_first10']],
    ['8 Dhul Hijjah', h(12, 8), WED, ['dhul_hijjah_first10']],
    ['9 Dhul Hijjah', h(12, 9), WED, ['arafah']],
    ['10 Dhul Hijjah', h(12, 10), WED, ['eid_adha']],
    ['13 Dhul Hijjah', h(12, 13), WED, ['ayyam_al_bid']],
    ['Eid al-Fitr on a Friday', h(10, 1), 5, ['friday', 'eid_fitr']],
  ])('%s', (_name, hijri, weekday, want) => {
    expect(specialDayIds(hijri, weekday)).toEqual(want);
  });

  it('every id it can return has its content in SPECIAL_DAYS', () => {
    const known = new Set(SPECIAL_DAYS.map((d) => d.id));
    for (let month = 1; month <= 12; month++) {
      for (let day = 1; day <= 30; day++) {
        for (let weekday = 0; weekday < 7; weekday++) {
          for (const id of specialDayIds(h(month, day), weekday)) expect(known).toContain(id);
        }
      }
    }
    for (const id of [...RECURRING_SPECIAL_DAYS, ...NIGHT_SPECIAL_DAYS])
      expect(known).toContain(id);
  });
});
