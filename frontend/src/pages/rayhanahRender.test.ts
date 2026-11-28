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
    };
  };
  globalThis.localStorage = mem() as unknown as Storage;
  globalThis.sessionStorage = mem() as unknown as Storage;
  return null;
});
void store;

// zustand's server render reads the initial state, so the signed-in user is mocked.
const session = vi.hoisted(() => ({
  user: { uid: 'u1', gender: 'female', displayName: 'Amina Rahman' } as {
    uid: string;
    gender: string;
    displayName: string;
  } | null,
}));
vi.mock('../store/useAuthStore.js', () => {
  const state = () => ({ user: session.user, isDemoMode: false, aiEnabled: false });
  const useAuthStore = Object.assign((select: (s: unknown) => unknown) => select(state()), {
    getState: state,
    setState: () => undefined,
    subscribe: () => () => undefined,
  });
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
vi.mock('../components/RayhanahSettingsDrawer.js', () => ({ default: () => null }));
vi.mock('react-dom', async (original) => ({
  ...(await original<typeof import('react-dom')>()),
  createPortal: (children: unknown) => children,
}));

import en from '../locales/en/common.json';
import RayhanahCycle from './RayhanahCycle.js';
import { getTrackingDay } from '../utils/trackingDay.js';

// Audit P4-1: the demo never keeps a started period, so the browser baselines show
// only the quiet page and its dialogs. This server-renders the unmodified page for
// every state with a period, a pregnancy, a prediction, owed fasts and a shared
// status, and compares the HTML with files recorded BEFORE the page was split.

const DIR = './rayhanahRender.baselines';

const addDays = (date: string, n: number): string => {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const i18n = createInstance();

beforeAll(async () => {
  await i18n.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    // Only the weekday names, which the calendar reads as a list; every other string falls back to the code's own English.
    resources: { en: { translation: { cycleCalendar: { weekdays: en.cycleCalendar.weekdays } } } },
    interpolation: { escapeValue: false },
  });
  vi.useFakeTimers({ toFake: ['Date'] });
});

afterAll(() => {
  vi.useRealTimers();
});

const at = (iso: string) => vi.setSystemTime(new Date(iso));
const NOW = '2026-10-15T14:00:00+06:00';

beforeEach(() => {
  localStorage.clear();
  session.user = { uid: 'u1', gender: 'female', displayName: 'Amina Rahman' };
  at(NOW);
});

const summary = (over: Record<string, unknown>) => ({
  active: null,
  prediction: { nextStart: null, avgCycleDays: 28, avgPeriodDays: 5, basedOnCycles: 0 },
  madhab: 'majority',
  logs: [],
  days: [],
  partnerSync: { enabled: false, partnerUid: null },
  pregnancy: { active: false, dueDate: null, weeksAlong: null },
  ...over,
});
const seedCycle = (over: Record<string, unknown>) => (qc: QueryClient) =>
  qc.setQueryData(['cycle', 'summary', getTrackingDay()], summary(over));

const seedFasting = (qadaOwed: number, qadaCompleted: number) => (qc: QueryClient) => {
  const d = new Date();
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  qc.setQueryData(['fasting', 'summary', day], {
    profile: { qadaOwed, kaffarah: { active: false, targetDays: 0 }, vows: [] },
    qadaCompleted,
  });
};
const seedFriends = (qc: QueryClient) =>
  qc.setQueryData(['social', 'friends'], [{ uid: 'f1', displayName: 'Maryam' }]);

const TODAY = '2026-10-15';
const active = (over: Record<string, unknown> = {}) => ({
  type: 'hayd',
  startDate: '2026-10-13',
  dayCount: 3,
  maxDays: 15,
  beyondMax: false,
  ...over,
});
const note = (over: Record<string, unknown> = {}) => ({
  date: TODAY,
  flow: 'medium',
  symptoms: ['cramps', 'fatigue'],
  moods: ['calm', 'tired'],
  garden: ['adhkar', 'dhikr'],
  ...over,
});
const nextIn = (n: number) => ({
  prediction: {
    nextStart: addDays(TODAY, n),
    avgCycleDays: 28,
    avgPeriodDays: 5,
    basedOnCycles: 3,
  },
});

function render(el: ReactElement, seed: Array<(qc: QueryClient) => void> = []): string {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  for (const s of seed) s(qc);
  // The page hands its dialogs to createPortal(…, document.body); a server has no document.
  const g = globalThis as unknown as { document?: unknown };
  g.document = { body: {} };
  let html: string;
  try {
    html = renderToString(
      createElement(
        I18nextProvider,
        { i18n },
        createElement(QueryClientProvider, { client: qc }, createElement(MemoryRouter, null, el))
      )
    );
  } finally {
    delete g.document;
  }
  // One tag per line, so a baseline diff points at the node.
  return html.replace(/></g, '>\n<') + '\n';
}

const page = () => createElement(RayhanahCycle);
const withSummary = (over: Record<string, unknown>, ...more: Array<(qc: QueryClient) => void>) =>
  render(page(), [seedCycle(over), ...more]);

const ALL_GARDEN = ['adhkar', 'dhikr', 'salawat', 'istighfar', 'listen', 'learn', 'kindness'];

const CASES: Array<[string, () => string]> = [
  ['loading', () => render(page())],
  [
    'active-day-3-with-notes',
    () => withSummary({ active: active(), days: [note()] }, seedFasting(5, 2)),
  ],
  ['active-no-notes', () => withSummary({ active: active() })],
  [
    'active-full-garden',
    () => withSummary({ active: active(), days: [note({ garden: ALL_GARDEN })] }),
  ],
  [
    'active-past-maximum-majority',
    () => withSummary({ active: active({ dayCount: 17, beyondMax: true }), days: [note()] }),
  ],
  [
    'active-past-maximum-hanafi-nifas',
    () =>
      withSummary({
        active: active({ type: 'nifas', dayCount: 45, maxDays: 40, beyondMax: true }),
        madhab: 'hanafi',
      }),
  ],
  [
    'pregnant-with-week-and-due-date',
    () => withSummary({ pregnancy: { active: true, dueDate: '2027-02-10', weeksAlong: 20 } }),
  ],
  [
    'pregnant-without-week',
    () => withSummary({ pregnancy: { active: true, dueDate: null, weeksAlong: null } }),
  ],
  ['quiet-no-history', () => withSummary({})],
  ['quiet-with-prediction', () => withSummary(nextIn(12))],
  ['quiet-period-may-start-today', () => withSummary(nextIn(0))],
  ['quiet-period-may-start-tomorrow', () => withSummary(nextIn(1))],
  ['quiet-period-in-three-days', () => withSummary(nextIn(3))],
  // The expected start passed 19 days ago with no period logged (seen 2026-11-27).
  ['quiet-expected-period-has-passed', () => withSummary(nextIn(-19))],
  [
    'quiet-ended-two-days-ago-offers-reopen',
    () =>
      withSummary({
        logs: [{ _id: 'l1', type: 'hayd', startDate: '2026-10-08', endDate: '2026-10-13' }],
        ...nextIn(20),
      }),
  ],
  [
    'quiet-ended-four-days-ago-no-reopen',
    () =>
      withSummary({
        logs: [{ _id: 'l1', type: 'hayd', startDate: '2026-10-06', endDate: '2026-10-11' }],
        ...nextIn(20),
      }),
  ],
  ['owed-fasts-three-remaining', () => withSummary({}, seedFasting(5, 2))],
  ['owed-fasts-one-remaining', () => withSummary({}, seedFasting(3, 2))],
  ['owed-fasts-all-made-up', () => withSummary({}, seedFasting(3, 3))],
  [
    'owed-fasts-with-ramadan-near',
    () => {
      at('2027-01-20T14:00:00+06:00');
      return render(page(), [
        (qc) => qc.setQueryData(['cycle', 'summary', getTrackingDay()], summary({})),
        seedFasting(6, 1),
      ]);
    },
  ],
  [
    'sharing-status-with-a-friend',
    () => withSummary({ partnerSync: { enabled: true, partnerUid: 'f1' } }, seedFriends),
  ],
  [
    'sharing-status-friend-not-loaded',
    () => withSummary({ partnerSync: { enabled: true, partnerUid: 'f1' } }),
  ],
  [
    'brother-sees-the-gate',
    () => {
      session.user = { uid: 'u2', gender: 'male', displayName: 'Omar' };
      return withSummary({});
    },
  ],
  [
    'signed-out-shows-nothing',
    () => {
      session.user = null;
      return withSummary({});
    },
  ],
];

describe('Rayhanah renders the same HTML as before the split', () => {
  it.each(CASES)('%s', async (name, build) => {
    await expect(build()).toMatchFileSnapshot(`${DIR}/${name}.html`);
  });
});
