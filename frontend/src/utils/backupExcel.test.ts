import { describe, expect, it } from 'vitest';
import { buildExcelSheets } from './backupExcel.js';

// Echo translator: the key is the label, so tests read the structure.
const t = (key: string) => key.replace('settings.xlsx.', '');

const file = {
  exportedAt: '2026-10-10T08:00:00.000Z',
  profile: { displayName: 'Amina' },
  settings: {
    dayStartMode: 'fajr',
    hijriOffset: 0,
    aiEnabled: false,
    app: { bustandeen_calc_method: 'Karachi' },
  },
  zikr: {
    totalCount: 133,
    zikrTotals: { Alhamdulillah: 33, SubhanAllah: 100 },
    streak: { currentStreak: 2, longestStreak: 5 },
    daily: [
      { date: '2026-10-07T00:00:00.000Z', zikrType: 'SubhanAllah', count: 100 },
      { date: '2026-10-07T00:00:00.000Z', zikrType: 'Alhamdulillah', count: 33 },
    ],
  },
  salat: {
    logs: [
      {
        date: '2026-10-07',
        prayers: {
          fajr: { status: 'completed' },
          isha: { status: 'kaza' },
          asr: { status: 'missed' },
        },
      },
    ],
    kaza: {
      debt: { owed: { fajr: 2, asr: 1 } },
      units: [
        {
          prayer: 'asr',
          missedDate: '2026-10-06',
          status: 'paid',
          paidAt: '2026-10-07T12:00:00.000Z',
        },
      ],
    },
  },
  quran: {
    profile: { khatmCount: 1 },
    logs: [{ date: '2026-10-07', pages: 2, ayat: 10, durationSec: 600 }],
  },
  rayhanah: { days: [{ date: '2026-10-01', note: { flow: 'light' } }] },
};

describe('buildExcelSheets', () => {
  const sheets = buildExcelSheets(file, t);
  const byName = Object.fromEntries(sheets.map((s) => [s.name, s.rows]));
  const overview = Object.fromEntries(byName.sheetOverview.map((r) => [r.item, r.value]));

  it('computes the overview from the file', () => {
    expect(overview.zikrTotal).toBe(133);
    expect(overview.zikrDays).toBe(1);
    expect(overview.zikrBest).toBe(5);
    expect(overview.salatDone).toBe(1);
    expect(overview.salatKaza).toBe(1);
    expect(overview.salatMissed).toBe(1);
    expect(overview.kazaOwed).toBe(3);
    expect(overview.quranMinutes).toBe(10);
    expect(overview.khatms).toBe(1);
  });

  it('has one row per day and per kaza unit', () => {
    expect(byName.sheetZikrDaily).toHaveLength(2);
    expect(byName.sheetSalat[0]).toMatchObject({
      date: '2026-10-07',
      'prayer.fajr': 'status.completed',
    });
    expect(byName.sheetKaza[0]).toMatchObject({ missedOn: '2026-10-06', paidOn: '2026-10-07' });
    expect(byName.sheetZikrTotals[0]).toEqual({ zikr: 'SubhanAllah', lifetime: 100 });
  });

  it('includes settings, drops empty sheets and never includes Rayhanah', () => {
    expect(
      byName.sheetSettings.some((r) => r.setting === 'calc_method' && r.value === 'Karachi')
    ).toBe(true);
    expect(byName.sheetHifz).toBeUndefined();
    expect(JSON.stringify(sheets)).not.toContain('light');
    expect(sheets.every((s) => s.name.length <= 31)).toBe(true);
  });
});
