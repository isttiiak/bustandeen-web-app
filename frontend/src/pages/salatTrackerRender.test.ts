import { createElement, type ReactElement } from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { createInstance } from 'i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// The stores read localStorage and sessionStorage when they are first imported.
const store = vi.hoisted(() => {
  const mem = () => {
    const m = new Map<string, string>();
    return {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => void m.set(k, String(v)),
      removeItem: (k: string) => void m.delete(k),
      clear: () => m.clear(),
      key: (i: number) => [...m.keys()][i] ?? null,
      get length() {
        return m.size;
      },
    };
  };
  globalThis.localStorage = mem() as unknown as Storage;
  globalThis.sessionStorage = mem() as unknown as Storage;
  return null;
});
void store;

// zustand's server render reads the initial state, so the signed-in user is mocked.
// (The page calls it with no selector, other components with one.)
const session = vi.hoisted(() => ({
  user: { uid: 'u1', gender: 'male', displayName: 'Omar' } as {
    uid: string;
    gender: string;
    displayName: string;
  } | null,
}));
vi.mock('../store/useAuthStore.js', () => {
  const state = () => ({ user: session.user, isDemoMode: false, aiEnabled: false });
  const useAuthStore = Object.assign(
    (select?: (s: unknown) => unknown) => (select ? select(state()) : state()),
    { getState: state, setState: () => undefined, subscribe: () => () => undefined }
  );
  return { useAuthStore };
});
vi.mock('../store/useUiStore.js', () => {
  const state = () => ({ discreetMode: false, reduceMotion: false, hideBmi: false });
  const useUiStore = Object.assign((select: (s: unknown) => unknown) => select(state()), {
    getState: state,
    setState: () => undefined,
    subscribe: () => () => undefined,
  });
  return { useUiStore };
});

// Portaled even while closed, which a server render cannot do; not part of the split.
vi.mock('../components/SalatSettings.js', () => ({ default: () => null }));
vi.mock('../components/SignInSheet.js', () => ({ default: () => null }));

import SalatTracker from './SalatTracker.js';
import { getTrackingDay } from '../utils/trackingDay.js';

// Audit P4-1: the browser baselines show the demo's Salat tracker. This server-renders
// the unmodified page for what the demo cannot reach (a guest, the istiḥāḍa reminder,
// logged prayers with every tag, joined and shortened prayers, a past day, Tarawih
// done) and compares the HTML with files recorded BEFORE the page was split.

const DIR = './salatTrackerRender.baselines';
const LOCATION = JSON.stringify({ latitude: 23.8103, longitude: 90.4125, name: 'Dhaka' });

const i18n = createInstance();

beforeAll(async () => {
  await i18n.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    resources: {},
    interpolation: { escapeValue: false },
  });
  vi.useFakeTimers({ toFake: ['Date'] });
});

afterAll(() => {
  vi.useRealTimers();
});

const at = (iso: string) => vi.setSystemTime(new Date(iso));
const EVENING = '2026-10-15T19:00:00+06:00';

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('bustandeen_location', LOCATION);
  session.user = { uid: 'u1', gender: 'male', displayName: 'Omar' };
  at(EVENING);
});

const DAY = '2026-10-15';
const prayers = (over: Record<string, Record<string, unknown>> = {}) => {
  const base: Record<string, Record<string, unknown>> = {
    fajr: { status: 'pending' },
    dhuhr: { status: 'pending' },
    asr: { status: 'pending' },
    maghrib: { status: 'pending' },
    isha: { status: 'pending' },
  };
  return { ...base, ...over };
};
const logOf = (date: string, over: Record<string, Record<string, unknown>> = {}, nafl = {}) => ({
  _id: `log-${date}`,
  userId: 'u1',
  date,
  prayers: prayers(over),
  nafl: { completed: false, types: [], rakat: 2, ...nafl },
});
const seedLog = (log: ReturnType<typeof logOf>) => (qc: QueryClient) =>
  qc.setQueryData(['salat', 'log', log.date], log);
const seedWeek = (qc: QueryClient) =>
  qc.setQueryData(['salat', 'analytics', 7, getTrackingDay()], {
    last7Days: ['09', '10', '11', '12', '13', '14', '15'].map((d, i) => ({
      date: `2026-10-${d}`,
      completed: i % 6,
      total: 5,
    })),
    calendarData: ['11', '12', '13', '14', '15'].map((d, i) => ({
      date: `2026-10-${d}`,
      completed: i,
      total: 5,
      logged: true,
    })),
  });
const seedDebt = (qc: QueryClient) =>
  qc.setQueryData(['salat', 'debt'], {
    owed: { fajr: 3, dhuhr: 0, asr: 2, maghrib: 0, isha: 1 },
    totalOwed: 6,
    since: '2026-09-01',
  });
const seedCycle = (active: Record<string, unknown>) => (qc: QueryClient) =>
  qc.setQueryData(['cycle', 'summary', getTrackingDay()], {
    active,
    prediction: { nextStart: null, avgCycleDays: 28, avgPeriodDays: 5, basedOnCycles: 0 },
    madhab: 'majority',
    logs: [],
    days: [],
    partnerSync: { enabled: false, partnerUid: null },
    pregnancy: { active: false, dueDate: null, weeksAlong: null },
  });
const seedRamadanFast = (tarawih: boolean) => (qc: QueryClient) => {
  const d = new Date();
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  qc.setQueryData(
    ['fasting', 'history', 3, day],
    [{ _id: 'f1', userId: 'u1', date: DAY, category: 'ramadan', status: 'completed', tarawih }]
  );
};
const journey = (extra: Record<string, unknown> = {}) =>
  localStorage.setItem(
    'bustandeen_musafir',
    JSON.stringify({
      active: true,
      startedAt: '2026-10-14',
      startAfter: 'fajr',
      destination: 'Chattogram',
      plannedStay: 3,
      school: 'majority',
      ...extra,
    })
  );

function render(
  seed: Array<(qc: QueryClient) => void> = [],
  url = '/salat',
  el: ReactElement = createElement(SalatTracker)
): string {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  for (const s of seed) s(qc);
  const html = renderToString(
    createElement(
      I18nextProvider,
      { i18n },
      createElement(
        QueryClientProvider,
        { client: qc },
        createElement(MemoryRouter, { initialEntries: [url] }, el)
      )
    )
  );
  // One tag per line, so a baseline diff points at the node.
  return html.replace(/></g, '>\n<') + '\n';
}

const FULL_DAY = {
  fajr: { status: 'completed', location: 'mosque', tasbeeh: true, ayatulKursi: true },
  dhuhr: { status: 'kaza', location: 'home' },
  asr: { status: 'missed', missedReason: 'work' },
  maghrib: { status: 'completed', location: 'jamat' },
};

const CASES: Array<[string, () => string]> = [
  ['guest-evening', () => ((session.user = null), render())],
  ['empty-evening', () => render([seedLog(logOf(DAY)), seedWeek, seedDebt])],
  ['full-day-with-every-tag', () => render([seedLog(logOf(DAY, FULL_DAY)), seedWeek, seedDebt])],
  [
    'all-five-done-and-nafl',
    () =>
      render([
        seedLog(
          logOf(
            DAY,
            Object.fromEntries(
              ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].map((p) => [p, { status: 'completed' }])
            ),
            { completed: true, types: ['duha', 'tahajjud'], rakat: 8 }
          )
        ),
        seedWeek,
      ]),
  ],
  [
    'past-day-unlogged-reads-as-missed',
    () => render([seedLog(logOf('2026-10-10')), seedWeek], '/salat?date=2026-10-10'),
  ],
  [
    'past-day-at-the-start-date',
    () => {
      localStorage.setItem('bustandeen_salat_start_date', '2026-10-10');
      return render([seedLog(logOf('2026-10-10')), seedWeek], '/salat?date=2026-10-10');
    },
  ],
  [
    'a-bad-date-in-the-address-falls-back-to-today',
    () => render([seedLog(logOf(DAY))], '/salat?date=not-a-date'),
  ],
  [
    'rayhanah-day-is-excused',
    () =>
      render([
        seedCycle({
          type: 'hayd',
          startDate: '2026-10-13',
          dayCount: 3,
          maxDays: 15,
          beyondMax: false,
        }),
        seedWeek,
      ]),
  ],
  [
    'istihada-reminder-shows-before-a-period-that-starts-later',
    () =>
      render([
        seedLog(logOf(DAY)),
        seedCycle({
          type: 'hayd',
          startDate: '2026-10-16',
          dayCount: 17,
          maxDays: 15,
          beyondMax: true,
        }),
      ]),
  ],
  [
    'ramadan-isha-tarawih-not-yet',
    () => {
      at('2027-02-20T20:00:00+06:00');
      return render([seedLog(logOf('2027-02-20')), seedRamadanFast(false)]);
    },
  ],
  [
    'ramadan-isha-tarawih-done',
    () => {
      at('2027-02-20T20:00:00+06:00');
      return render([seedLog(logOf('2027-02-20')), seedRamadanFast(true)]);
    },
  ],
  [
    'journey-shortened-and-joined',
    () => {
      journey();
      return render([
        seedLog(
          logOf(DAY, {
            fajr: { status: 'completed' },
            dhuhr: { status: 'completed', qasr: true, jam: 'takhir' },
            asr: { status: 'completed', qasr: true, jam: 'takhir' },
            maghrib: { status: 'completed', jam: 'taqdim' },
            isha: { status: 'completed', qasr: false, jam: 'taqdim' },
          })
        ),
      ]);
    },
  ],
  [
    'journey-hanafi-afternoon',
    () => {
      journey({ school: 'hanafi' });
      at('2026-10-15T12:00:00+06:00');
      return render([seedLog(logOf(DAY, { fajr: { status: 'completed' } }))]);
    },
  ],
  [
    'journey-friday',
    () => {
      journey();
      at('2026-10-16T12:30:00+06:00');
      return render([seedLog(logOf('2026-10-16'))]);
    },
  ],
  [
    'friday-the-hour-of-response',
    () => {
      at('2026-10-16T15:50:00+06:00');
      return render([seedLog(logOf('2026-10-16', { fajr: { status: 'completed' } }))]);
    },
  ],
  [
    'no-saved-place',
    () => (localStorage.removeItem('bustandeen_location'), render([seedLog(logOf(DAY))])),
  ],
];

describe('the Salat tracker renders the same HTML as before the split', () => {
  it.each(CASES)('%s', async (name, build) => {
    await expect(build()).toMatchFileSnapshot(`${DIR}/${name}.html`);
  });
});
