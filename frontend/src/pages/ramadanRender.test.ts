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

// zustand's server render reads the initial state, so the signed-in user and the
// UI switches are mocked.
const session = vi.hoisted(() => ({
  user: { uid: 'u1', gender: 'female' } as { uid: string; gender: string } | null,
}));
vi.mock('../store/useAuthStore.js', () => {
  const state = () => ({ user: session.user, isDemoMode: false });
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
vi.mock('../components/SignInSheet.js', () => ({
  SignInSheet: () => null,
  default: () => null,
  useSignInGate: () => ({
    isGuest: !session.user,
    canSave: () => !!session.user,
    sheet: null,
  }),
}));

import RamadanTracker from './RamadanTracker.js';
import { getTrackingDay } from '../utils/trackingDay.js';

// Audit P4-1: the browser baselines show the demo's Ramadan page, where no fast is
// ever shown as logged and no period is ever running. This server-renders the
// unmodified page with logged fasts, tarawih nights, broken and intended days and
// an excused (Rayhanah) stretch, and compares the HTML with files recorded BEFORE
// the page was split.

const DIR = './ramadanRender.baselines';
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

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('bustandeen_location', LOCATION);
  session.user = { uid: 'u1', gender: 'female' };
});

const at = (iso: string) => vi.setSystemTime(new Date(iso));

const log = (date: string, status: string, extra: Record<string, unknown> = {}) => ({
  _id: `l-${date}`,
  userId: 'u1',
  date,
  category: 'ramadan',
  status,
  ...extra,
});

const seedHistory = (logs: unknown[]) => (qc: QueryClient) => {
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  qc.setQueryData(['fasting', 'history', 90, today], logs);
};

const summary = (over: Record<string, unknown>) => ({
  active: null,
  prediction: { nextStart: null, avgCycleDays: 28, avgPeriodDays: 5, basedOnCycles: 3 },
  madhab: 'majority',
  logs: [],
  days: [],
  partnerSync: { enabled: false, partnerUid: null },
  pregnancy: { active: false, dueDate: null, weeksAlong: null },
  ...over,
});
const seedSummary = (over: Record<string, unknown>) => (qc: QueryClient) =>
  qc.setQueryData(['cycle', 'summary', getTrackingDay()], summary(over));

function render(el: ReactElement, seed: Array<(qc: QueryClient) => void> = []): string {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  for (const s of seed) s(qc);
  const html = renderToString(
    createElement(
      I18nextProvider,
      { i18n },
      createElement(QueryClientProvider, { client: qc }, createElement(MemoryRouter, null, el))
    )
  );
  // One tag per line, so a baseline diff points at the node.
  return html.replace(/></g, '>\n<') + '\n';
}

const page = () => createElement(RamadanTracker);

// Day 1 of Ramadan 1448 is 8 February 2027.
const MIXED = [
  log('2027-02-08', 'completed'),
  log('2027-02-09', 'completed', { tarawih: true }),
  log('2027-02-10', 'broken'),
  log('2027-02-11', 'intended'),
  log('2027-02-12', 'completed', { tarawih: true }),
  log('2027-02-13', 'completed'),
];

const CASES: Array<[string, () => string]> = [
  [
    'fasted-today',
    () => {
      at('2027-02-20T16:00:00+06:00');
      return render(page(), [seedHistory([...MIXED, log('2027-02-20', 'completed')])]);
    },
  ],
  [
    'excused-today',
    () => {
      at('2027-02-20T16:00:00+06:00');
      return render(page(), [
        seedHistory(MIXED),
        seedSummary({
          active: {
            type: 'hayd',
            startDate: '2027-02-18',
            dayCount: 3,
            maxDays: 15,
            beyondMax: false,
          },
          logs: [{ startDate: '2027-02-18', endDate: null }],
        }),
      ]);
    },
  ],
  [
    'excused-days-in-the-past',
    () => {
      at('2027-02-20T16:00:00+06:00');
      return render(page(), [
        seedHistory(MIXED),
        seedSummary({
          logs: [
            { startDate: '2027-02-14', endDate: '2027-02-18' },
            { startDate: '2027-02-10', endDate: '2027-02-11' },
          ],
        }),
      ]);
    },
  ],
  [
    'eve-of-last-ten-tarawih-logged',
    () => {
      at('2027-02-27T19:30:00+06:00');
      return render(page(), [
        seedHistory([
          ...MIXED,
          log('2027-02-27', 'completed'),
          log('2027-02-28', 'intended', { tarawih: true }),
        ]),
      ]);
    },
  ],
  [
    'last-ten-with-marks',
    () => {
      at('2027-03-01T16:00:00+06:00');
      return render(page(), [
        seedHistory([
          ...MIXED,
          log('2027-02-28', 'completed', { tarawih: true }),
          log('2027-03-01', 'completed'),
        ]),
      ]);
    },
  ],
  [
    'guest',
    () => {
      at('2027-02-20T16:00:00+06:00');
      session.user = null;
      return render(page());
    },
  ],
  [
    'no-saved-place-fasted',
    () => {
      at('2027-02-20T16:00:00+06:00');
      localStorage.removeItem('bustandeen_location');
      return render(page(), [seedHistory([log('2027-02-20', 'completed')])]);
    },
  ],
];

describe('Ramadan renders the same HTML as before the split', () => {
  it.each(CASES)('%s', async (name, build) => {
    await expect(build()).toMatchFileSnapshot(`${DIR}/${name}.html`);
  });
});
