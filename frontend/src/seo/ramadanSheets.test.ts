// The three Ramadan print sheets (R2-R4): what each one carries, the stars of
// the odd nights, the blocks Istiak chose (Laylat al-Qadr duʿā + Zakat
// al-Fitr only), the verbatim Arabic, and the fasting length / Eid helpers.
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { cityBySlug } from './data/cities.js';
import { BD_DISTRICTS } from './data/bdDistricts.js';
import { ramadanPlan } from './utils/ramadanBd.js';
import { eidDays, fastingLength } from './utils/ramadanSheetData.js';
import { isOddNightFast } from './ramadanShift.js';
import { LAYLAT_AL_QADR_DUA } from './content/ramadanDuas.js';
import { FITRA_BD } from './locales/ramadanSheet.js';
import BdRamadanPage from './templates/BdRamadanPage.js';
import RamadanCalendarPage from './templates/RamadanCalendarPage.js';
import type { MoonSightingRecord } from '../utils/hijriOffset.js';

const HY = 1448;
const london = cityBySlug('london-united-kingdom')!;
const dhaka = cityBySlug('dhaka-bangladesh')!;
const district = BD_DISTRICTS.find((d) => d.citySlug === 'dhaka-bangladesh')!;
const rec = (hijriMonth: number, startDate: string): MoonSightingRecord => ({
  id: `BD-${hijriMonth}`,
  country: 'BD',
  hijriYear: HY,
  hijriMonth,
  startDate,
  effectiveFrom: startDate,
  offset: 0,
  note: '',
});

const world = () =>
  renderToStaticMarkup(
    createElement(RamadanCalendarPage, {
      lang: 'en',
      city: london,
      plan: ramadanPlan(london, HY, []),
      gregorianYear: 2027,
    })
  );
const bd = (records: MoonSightingRecord[] = []) =>
  renderToStaticMarkup(
    createElement(BdRamadanPage, {
      lang: 'bn',
      district,
      city: dhaka,
      plan: ramadanPlan(dhaka, HY, records),
      ym: '2027-02',
    })
  );

/** The markup of one sheet. */
function sheet(html: string, variant: 'timetable' | 'combined' | 'checklist'): string {
  const start = html.indexOf(`data-ramadan-sheet="${variant}"`);
  expect(start).toBeGreaterThan(-1);
  const end = html.indexOf('</section>', start);
  return html.slice(start, end);
}

const visibleRows = (s: string) =>
  [...s.matchAll(/<tr data-date="[^"]*" data-ramadan-row="(\d+)" data-fast="(\d+)"[^>]*>/g)].map(
    (m) => ({ fast: Number(m[2]), odd: /data-odd=""/.test(m[0]) })
  );

describe('isOddNightFast', () => {
  it('stars the fast after each odd night of the last ten', () => {
    const starred = Array.from({ length: 31 }, (_, i) => i).filter(isOddNightFast);
    expect(starred).toEqual([21, 23, 25, 27, 29]);
  });
});

describe('the three sheets on a worldwide page (London, en)', () => {
  const html = world();

  it('draws all three, hidden on screen, after the page', () => {
    expect(html).toContain('<div data-ramadan-sheets="" lang="en" aria-hidden="true">');
    for (const v of ['timetable', 'combined', 'checklist'])
      expect(html).toContain(`data-ramadan-sheet="${v}"`);
  });

  it('every sheet has 29 fasts + the possible 30th, stars on 21-29 odd', () => {
    for (const v of ['timetable', 'combined', 'checklist'] as const) {
      const rows = visibleRows(sheet(html, v));
      expect(rows.map((r) => r.fast)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
      expect(rows.filter((r) => r.odd).map((r) => r.fast)).toEqual([21, 23, 25, 27, 29]);
    }
  });

  it('timetable: Laylat al-Qadr duʿā (verbatim Arabic) and Zakat al-Fitr, nothing else', () => {
    const t = sheet(html, 'timetable');
    expect(t).toContain(LAYLAT_AL_QADR_DUA.arabic);
    expect(t).toContain('Tirmidhi 3513');
    expect(t).toContain('Bukhari 1503');
    expect(t).toContain('Ask your masjid for this year');
    expect(t).not.toContain('Islamic Foundation');
    expect([...t.matchAll(/data-sheet-block="(\w+)"/g)].map((m) => m[1])).toEqual(['dua', 'zakat']);
    // Eid: the day after the 29th (8 Mar) or after the possible 30th.
    expect(t).toContain('Eid is expected on March 9 or March 10.');
    // Iftar labelled Maghrib; no "exact sunset" anywhere.
    expect(t).toContain('Iftar (Maghrib)');
    expect(html).not.toMatch(/exact sunset/i);
  });

  it('combined: five prayer boxes, tarawih and nafl per row, no side blocks', () => {
    const c = sheet(html, 'combined');
    expect(c).not.toContain('data-sheet-block');
    const firstRow = c.slice(
      c.indexOf('data-fast="1"'),
      c.indexOf('</tr>', c.indexOf('data-fast="1"'))
    );
    expect(firstRow.match(/class="rs-box"/g)).toHaveLength(7);
    expect(c).toContain('Tarawih');
  });

  it('checklist: name line, 30 juz, intentions and the zakat al-Fitr tick, no times', () => {
    const k = sheet(html, 'checklist');
    expect(k).toContain('My Ramadan 2027');
    expect(k).toContain('class="rs-name"');
    expect(k.match(/<div class="rs-juz">(.*?)<\/div>/)![1].match(/<span>/g)).toHaveLength(30);
    expect(k).toContain('Zakat al-Fitr given before the Eid prayer');
    expect(k).not.toContain('rs-sh');
  });

  it('carries no "free, ad-free" line and the footer is the page address', () => {
    expect(html).not.toMatch(/ad-free/i);
    expect(sheet(html, 'timetable')).toContain(
      '<p class="rs-foot">bustandeen.com/ramadan-calendar/london-united-kingdom/2027</p>'
    );
  });
});

describe('Bangladesh district page (Dhaka, bn)', () => {
  it('Bangla sheets with the district, division and Islamic Foundation amounts', () => {
    const html = bd();
    const t = sheet(html, 'timetable');
    expect(t).toContain('রমজান ২০২৭: সেহরি ও ইফতার');
    expect(t).toContain('ঢাকা জেলা · ঢাকা বিভাগ, বাংলাদেশ');
    expect(t).toContain('জনপ্রতি ১১০ টাকা থেকে ২,৮০৫ টাকা');
    expect(t).toContain(LAYLAT_AL_QADR_DUA.arabic);
    // Sehri ends before Fajr in Bangladesh (R0a): no "(ফজর)" in the head.
    expect(t).toContain('<th class="rs-c">সেহরির শেষ</th>');
    // Bangla digits in the fast numbers.
    expect(t).toContain('<span data-fast-num="">২১</span>');
  });

  it('a settled 30-day month: 30 fasts, no possible row, one Eid date', () => {
    const plan = ramadanPlan(dhaka, HY, [rec(9, '2027-02-09'), rec(10, '2027-03-11')]);
    expect(plan.days).toHaveLength(30);
    expect(eidDays(plan).map((d) => d.toISOString().slice(0, 10))).toEqual(['2027-03-11']);
    const t = sheet(bd([rec(9, '2027-02-09'), rec(10, '2027-03-11')]), 'timetable');
    expect(visibleRows(t)).toHaveLength(30);
    expect(t).not.toContain('data-possible=""');
  });
});

describe('fasting length', () => {
  it('runs from the end of suhoor to iftar and grows through the month', () => {
    const plan = ramadanPlan(london, HY, []);
    const len = fastingLength(plan, (d) => d.date);
    const mins = (i: number) =>
      Math.round(
        (plan.days[i].times.maghrib.getTime() - plan.days[i].times.sehri.getTime()) / 60_000
      );
    expect(len.first).toBe(mins(0));
    expect(len.last).toBe(mins(plan.days.length - 1));
    expect(len.shortest.dateLabel).toBe('2027-02-08');
    expect(len.longest.dateLabel).toBe(plan.days[plan.days.length - 1].date);
    expect(len.last).toBeGreaterThan(len.first);
  });
});

it('the fitra figures carry their year, date and source', () => {
  expect(FITRA_BD).toMatchObject({ hijriYear: 1447, announced: '2026-02-25' });
  expect(FITRA_BD.sourceUrl).toMatch(/^https:\/\/www\.prothomalo\.com\//);
});
