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
// two UI switches that change Home are mocked.
const session = vi.hoisted(() => ({
  user: { uid: 'u1', gender: 'female' } as { uid: string; gender: string } | null,
  discreetMode: false,
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
  const state = () => ({
    discreetMode: session.discreetMode,
    homeSpecialLayout: 'strip',
    homeAdhkar: true,
    reduceMotion: false,
    hideBmi: false,
  });
  const useUiStore = Object.assign((select: (s: unknown) => unknown) => select(state()), {
    getState: state,
    setState: () => undefined,
    subscribe: () => () => undefined,
  });
  return { useUiStore };
});

// Portaled even while closed, which a server render cannot do; not part of the split.
vi.mock('../components/zikr/ZikrLogCountsModal.js', () => ({ default: () => null }));

import Home from './Home.js';
import { getTrackingDay } from '../utils/trackingDay.js';

// Audit P4-1: the browser baselines show the demo's Home, where the Rayhanah
// banner and the "period may begin" notice never appear (the demo does not keep
// a started period). This server-renders the unmodified page for those states,
// and for the first-run setup card and "no saved place", and compares the HTML
// with files recorded BEFORE the page was split.

const DIR = './homeRender.baselines';
const LOCATION = JSON.stringify({ latitude: 23.8103, longitude: 90.4125, name: 'Dhaka' });

const addDays = (date: string, n: number): string => {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
const active = {
  active: { type: 'hayd', startDate: '2026-10-13', dayCount: 3, maxDays: 15, beyondMax: false },
};
const nextIn = (days: number) => ({
  prediction: {
    nextStart: addDays(getTrackingDay(), days),
    avgCycleDays: 28,
    avgPeriodDays: 5,
    basedOnCycles: 3,
  },
});

const i18n = createInstance();

beforeAll(async () => {
  await i18n.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    resources: {},
    interpolation: { escapeValue: false },
  });
  // A fixed "now": the tracking day, the prayer window and the Hijri date.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-15T14:00:00+06:00'));
});

afterAll(() => {
  vi.useRealTimers();
});

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('bustandeen_location', LOCATION);
  // The setup card needs "not onboarded"; the other cases skip it by a null profile only when asked.
  session.user = { uid: 'u1', gender: 'female' };
  session.discreetMode = false;
});

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

const page = () => createElement(Home);

const CASES: Array<[string, () => string]> = [
  ['rayhanah-days-banner', () => render(page(), [seedSummary(active)])],
  [
    'rayhanah-days-banner-discreet',
    () => {
      session.discreetMode = true;
      return render(page(), [seedSummary(active)]);
    },
  ],
  ['period-may-begin-today', () => render(page(), [seedSummary(nextIn(0))])],
  ['period-may-begin-in-one-day', () => render(page(), [seedSummary(nextIn(1))])],
  ['period-may-begin-in-two-days', () => render(page(), [seedSummary(nextIn(2))])],
  [
    'period-may-begin-discreet',
    () => {
      session.discreetMode = true;
      return render(page(), [seedSummary(nextIn(2))]);
    },
  ],
  ['period-four-days-away-shows-nothing', () => render(page(), [seedSummary(nextIn(4))])],
  ['setup-card', () => render(page(), [(qc) => qc.setQueryData(['user', 'profile'], null)])],
  [
    'no-saved-place',
    () => {
      localStorage.removeItem('bustandeen_location');
      return render(page(), [seedSummary({})]);
    },
  ],
  [
    'brother',
    () => {
      session.user = { uid: 'u2', gender: 'male' };
      return render(page());
    },
  ],
];

describe('Home renders the same HTML as before the split', () => {
  it.each(CASES)('%s', async (name, build) => {
    await expect(build()).toMatchFileSnapshot(`${DIR}/${name}.html`);
  });
});
