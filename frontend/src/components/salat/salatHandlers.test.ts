// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The Salat tracker's tap handlers (audit P4-1 moved them into hooks), unit-tested
// for what a browser test cannot reach through the demo: the guest gate on every
// write, the kaza debt clamp, the hard block on a prayer whose time has not come,
// and the order of the qaṣr / jamʿ writes. Fiqh-sensitive (CLAUDE.md): the
// expectations below are the existing behaviour, not new rules.

vi.mock('react-hot-toast', () => {
  const toast = Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() });
  return { default: toast };
});
vi.mock('../../utils/celebrate.js', () => ({
  celebrateSmall: vi.fn(),
  celebrateAllPrayers: vi.fn(),
}));

import toast from 'react-hot-toast';
import type { SalatTrackerState } from './useSalatTrackerState.js';
import { useSalatNaflDebt } from './useSalatNaflDebt.js';
import { useSalatPrayerHandlers } from './useSalatPrayerHandlers.js';
import { todayStr } from './salatParts.js';

type Prayers = Record<string, Record<string, unknown>>;

function fakeState(over: Partial<Record<string, unknown>> = {}, prayers: Prayers = {}) {
  const updatePrayer = { mutate: vi.fn() };
  const updateNafl = { mutate: vi.fn() };
  const setDebtExact = { mutate: vi.fn() };
  const s = {
    t: (_k: string, fallback: string) => fallback,
    user: { uid: 'u1' },
    setShowGuestDialog: vi.fn(),
    selectedDate: todayStr(),
    isToday: true,
    todayPrayerTimes: null,
    log: {
      prayers: {
        fajr: { status: 'pending' },
        dhuhr: { status: 'pending' },
        asr: { status: 'pending' },
        maghrib: { status: 'pending' },
        isha: { status: 'pending' },
        ...prayers,
      },
      nafl: { completed: false, types: [], rakat: 2 },
    },
    updatePrayer,
    updateNafl,
    travelPrayer: () => false,
    setExpandedPrayer: vi.fn(),
    debt: { owed: { fajr: 1, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 }, totalOwed: 1 },
    setDebtDrafts: vi.fn(),
    setDebtExact,
    rakatOverrides: {},
    setRakatOverrides: vi.fn(),
    setNaflExpanded: vi.fn(),
    ...over,
  };
  return s as unknown as SalatTrackerState & {
    updatePrayer: { mutate: ReturnType<typeof vi.fn> };
    updateNafl: { mutate: ReturnType<typeof vi.fn> };
    setDebtExact: { mutate: ReturnType<typeof vi.fn> };
    setShowGuestDialog: ReturnType<typeof vi.fn>;
  };
}

const handlers = (s: SalatTrackerState, credit = vi.fn()) =>
  renderHook(() => useSalatPrayerHandlers(s, credit)).result.current;
const naflDebt = (s: SalatTrackerState) => renderHook(() => useSalatNaflDebt(s)).result.current;
const sent = (m: { mutate: ReturnType<typeof vi.fn> }) => m.mutate.mock.calls.map((c) => c[0]);

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('a guest never writes: every handler opens the sign-in sheet instead', () => {
  const taps: Array<[string, (s: SalatTrackerState) => void]> = [
    ['Done', (s) => handlers(s).handleStatus('fajr', 'completed')],
    ['Kaza', (s) => handlers(s).handleStatus('fajr', 'kaza')],
    ['Miss', (s) => handlers(s).handleStatus('fajr', 'missed')],
    ['missed reason', (s) => handlers(s).handleMissedReason('fajr', 'busy')],
    ['prayed as', (s) => handlers(s).setQasr('dhuhr', false)],
    ['join a pair', (s) => handlers(s).joinPair('dhuhr', 'taqdim')],
    ['flag as joined', (s) => handlers(s).toggleJoined('asr')],
    ['where it was prayed', (s) => handlers(s).handleSubTag('fajr', 'location', 'mosque')],
    ['tasbeeh', (s) => handlers(s).handleSubTag('fajr', 'tasbeeh', true)],
    ['nafl', (s) => naflDebt(s).handleNaflToggle()],
    ['nafl type', (s) => naflDebt(s).handleNaflTypeToggle('duha')],
    ['nafl rakah', (s) => naflDebt(s).handleTypeRakat('duha', 1)],
    ['kaza debt count', (s) => naflDebt(s).commitDebtEdit('fajr', '5')],
  ];
  it.each(taps)('%s', (_name, tap) => {
    const s = fakeState({ user: null });
    tap(s);
    expect(s.setShowGuestDialog).toHaveBeenCalledWith(true);
    expect(s.updatePrayer.mutate).not.toHaveBeenCalled();
    expect(s.updateNafl.mutate).not.toHaveBeenCalled();
    expect(s.setDebtExact.mutate).not.toHaveBeenCalled();
  });
});

describe('the kaza debt count', () => {
  it('is clamped to 0..9999 and dated today', () => {
    const s = fakeState();
    naflDebt(s).commitDebtEdit('asr', '12000');
    naflDebt(s).commitDebtEdit('dhuhr', '-5'); // 0, already 0: nothing sent
    naflDebt(s).commitDebtEdit('fajr', 'abc'); // 0, was 1
    expect(sent(s.setDebtExact)).toEqual([
      { prayer: 'asr', count: 9999, date: todayStr() },
      { prayer: 'fajr', count: 0, date: todayStr() },
    ]);
  });

  it('an unchanged count sends nothing, even for a guest', () => {
    const s = fakeState({ user: null });
    naflDebt(s).commitDebtEdit('fajr', '01');
    expect(s.setDebtExact.mutate).not.toHaveBeenCalled();
    expect(s.setShowGuestDialog).not.toHaveBeenCalled();
  });
});

describe('marking a prayer', () => {
  it('cannot be logged before its time today (unless it was joined early)', () => {
    const later = new Date(Date.now() + 3_600_000);
    const times = { fajr: later, dhuhr: later, asr: later, maghrib: later, isha: later };
    const s = fakeState({ todayPrayerTimes: { times, full: null } });
    handlers(s).handleStatus('asr', 'completed');
    expect(s.updatePrayer.mutate).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledTimes(1);

    const joined = fakeState(
      { todayPrayerTimes: { times, full: null } },
      {
        asr: { status: 'completed', jam: 'taqdim' },
      }
    );
    handlers(joined).handleStatus('asr', 'kaza');
    expect(sent(joined.updatePrayer)).toHaveLength(1);
  });

  it('tapping the same status again clears it, and takes the credited dhikr back first', () => {
    const credit = vi.fn();
    const s = fakeState({}, { fajr: { status: 'completed', tasbeeh: true, ayatulKursi: true } });
    handlers(s, credit).handleStatus('fajr', 'completed');
    expect(credit.mock.calls.map((c) => [c[0], c[1], c[3]])).toEqual([
      ['tasbeeh', false, 'fajr'],
      ['ayatulKursi', false, 'fajr'],
    ]);
    expect(sent(s.updatePrayer)).toEqual([{ prayer: 'fajr', status: 'pending', date: todayStr() }]);
  });

  it('un-marking one half of a joined pair un-joins the other half first', () => {
    const s = fakeState(
      {},
      {
        maghrib: { status: 'completed', jam: 'takhir', location: 'mosque' },
        isha: { status: 'completed', jam: 'takhir' },
      }
    );
    handlers(s).handleStatus('isha', 'completed');
    expect(sent(s.updatePrayer)).toEqual([
      expect.objectContaining({
        prayer: 'maghrib',
        status: 'completed',
        location: 'mosque',
        jam: null,
      }),
      { prayer: 'isha', status: 'pending', date: todayStr() },
    ]);
  });

  it('on a travel day a four-rakah prayer is logged shortened unless marked full', () => {
    const travel = fakeState({ travelPrayer: () => true });
    handlers(travel).handleStatus('dhuhr', 'completed');
    handlers(travel).handleStatus('fajr', 'completed');
    expect(sent(travel.updatePrayer).map((v) => [v.prayer, v.qasr])).toEqual([
      ['dhuhr', true],
      ['fajr', undefined],
    ]);
    const full = fakeState(
      { travelPrayer: () => true },
      { asr: { status: 'pending', qasr: false } }
    );
    handlers(full).handleStatus('asr', 'completed');
    expect(sent(full.updatePrayer)[0].qasr).toBe(false);
  });
});

describe('joining prayers on a journey', () => {
  it('joinPair logs both prayers in order, flagged with the kind of joining', () => {
    const s = fakeState();
    handlers(s).joinPair('dhuhr', 'taqdim');
    expect(sent(s.updatePrayer).map((v) => [v.prayer, v.status, v.jam, v.qasr])).toEqual([
      ['dhuhr', 'completed', 'taqdim', true],
      ['asr', 'completed', 'taqdim', true],
    ]);
  });

  it('toggleJoined flags both prayers as joined late, then un-flags them', () => {
    const s = fakeState(
      {},
      {
        maghrib: { status: 'completed' },
        isha: { status: 'kaza' },
      }
    );
    handlers(s).toggleJoined('isha');
    expect(sent(s.updatePrayer).map((v) => [v.prayer, v.status, v.jam])).toEqual([
      ['maghrib', 'completed', 'takhir'],
      ['isha', 'kaza', 'takhir'],
    ]);
    const joined = fakeState(
      {},
      {
        maghrib: { status: 'completed', jam: 'takhir' },
        isha: { status: 'completed', jam: 'takhir' },
      }
    );
    handlers(joined).toggleJoined('isha');
    expect(sent(joined.updatePrayer).map((v) => v.jam)).toEqual([null, null]);
  });

  it('"prayed as" on a not-yet-logged prayer marks it done', () => {
    const s = fakeState();
    handlers(s).setQasr('isha', false);
    expect(sent(s.updatePrayer)[0]).toMatchObject({
      prayer: 'isha',
      status: 'completed',
      qasr: false,
    });
  });
});
