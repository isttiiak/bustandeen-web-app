import { describe, expect, it } from 'vitest';
import { areaResets, fullResets } from './resetTracker.js';
import type { StatsResets } from '../hooks/useStatsResets.js';

const e = (date: string, resetAt: string, all = false, owedBefore?: number) => ({
  date,
  note: '',
  resetAt,
  all,
  ...(owedBefore === undefined ? {} : { owedBefore }),
});
const ALL1 = '2026-09-01T10:00:00.000Z';
const ALL2 = '2026-10-01T10:00:00.000Z';

const R: StatsResets = {
  zikr: {
    date: '2026-10-05',
    history: [e('2026-09-01', ALL1, true), e('2026-10-05', '2026-10-05T08:00:00.000Z')],
  },
  salat: {
    date: '2026-10-01',
    history: [e('2026-09-01', ALL1, true), e('2026-10-01', ALL2, true)],
  },
  fasting: {
    date: '2026-10-01',
    history: [e('2026-09-01', ALL1, true), e('2026-10-01', ALL2, true)],
  },
  quran: { date: '2026-10-01', history: [e('2026-10-01', ALL2, true)] },
  kaza: { date: '2026-10-10', history: [e('2026-10-10', '2026-10-10T05:00:00.000Z', false, 7)] },
};

describe('reset tracker', () => {
  it('lists an area newest first, with what the kaza reset cleared', () => {
    expect(areaResets(R, 'zikr').map((r) => r.date)).toEqual(['2026-10-05', '2026-09-01']);
    expect(areaResets(R, 'kaza')[0]).toMatchObject({ area: 'kaza', owedBefore: 7 });
  });
  it('counts each Reset all once, however many areas it touched', () => {
    expect(fullResets(R).map((r) => r.date)).toEqual(['2026-10-01', '2026-09-01']);
  });
  it('copes with no data and older servers without the kaza log', () => {
    expect(areaResets(undefined, 'salat')).toEqual([]);
    const { kaza: _kaza, ...old } = R;
    expect(areaResets(old as StatsResets, 'kaza')).toEqual([]);
    expect(fullResets(undefined)).toEqual([]);
  });
});
