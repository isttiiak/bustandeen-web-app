import { createElement, type ReactElement } from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { createInstance } from 'i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

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

// zustand's server render reads the initial state, so the signed-in user is
// mocked: the page shows its analytics only to a signed-in sister.
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

// The UI store asks the browser for the reduced-motion setting when it loads.
vi.mock('../store/useUiStore.js', () => {
  const state = () => ({ hideBmi: false, reduceMotion: false, discreetMode: false });
  const useUiStore = Object.assign((select: (s: unknown) => unknown) => select(state()), {
    getState: state,
    setState: () => undefined,
    subscribe: () => () => undefined,
  });
  return { useUiStore };
});

// These three render through a portal even while closed, which a server render
// cannot do. They are not part of the page split and are checked elsewhere.
vi.mock('../components/CycleEditModal.js', () => ({ default: () => null }));
vi.mock('../components/RayhanahSettingsDrawer.js', () => ({ default: () => null }));
vi.mock('../components/ConfirmDialog.js', () => ({ default: () => null }));

import CycleAnalytics from './CycleAnalytics.js';
import { getTrackingDay } from '../utils/trackingDay.js';

// Audit P4-1: the browser baselines show the demo sister's cycle analytics, one
// dataset. This server-renders the page from fixtures that reach every branch
// of its statistics (regular, irregular with the alert and the trend, nothing
// yet, a nifas log with pregnancy and BMI, the "not for you" screen), and
// compares the HTML with files recorded BEFORE the page was split. The
// handlers (log a past period, edit, delete, export) are covered by the
// browser baselines in characterize-states.spec.ts.

const DIR = './cycleAnalyticsRender.baselines';

const addDays = (date: string, n: number): string => {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

type Log = { _id: string; type: 'hayd' | 'nifas'; startDate: string; endDate: string | null };
type Day = {
  date: string;
  flow: 'light' | 'medium' | 'heavy' | null;
  symptoms: string[];
  moods: string[];
  garden: string[];
};

/** Periods that start `gaps[i]` days apart, each lasting `length` days, the first on `first`. */
function cycles(first: string, gaps: number[], length: number, ongoing = false) {
  const logs: Log[] = [];
  let start = first;
  [0, ...gaps].forEach((g, i) => {
    start = i === 0 ? first : addDays(start, g);
    const last = i === gaps.length;
    logs.push({
      _id: `c${i}`,
      type: 'hayd',
      startDate: start,
      endDate: last && ongoing ? null : addDays(start, length - 1),
    });
  });
  return logs;
}

/** A week of symptoms before each period (after the first) and flow during it. */
function notes(logs: Log[]): Day[] {
  const days: Day[] = [];
  logs.forEach((l, i) => {
    if (i > 0) {
      for (let d = -5; d <= -1; d++) {
        days.push({
          date: addDays(l.startDate, d),
          flow: null,
          symptoms: d % 2 ? ['cramps', 'fatigue'] : ['headache'],
          moods: i % 2 ? ['low'] : [],
          garden: [],
        });
      }
    }
    for (let d = 0; d < 4; d++) {
      days.push({
        date: addDays(l.startDate, d),
        flow: (['heavy', 'medium', 'medium', 'light'] as const)[d]!,
        symptoms: d === 0 ? ['cramps', 'backache'] : [],
        moods: [],
        garden: [],
      });
    }
  });
  return days;
}

const summaryOf = (logs: Log[], days: Day[], extra: Record<string, unknown> = {}) => ({
  active: null,
  prediction: { nextStart: null, avgCycleDays: 28, avgPeriodDays: 5, basedOnCycles: logs.length },
  madhab: 'majority',
  logs,
  days,
  partnerSync: { enabled: false, partnerUid: null },
  pregnancy: { active: false, dueDate: null, weeksAlong: null },
  ...extra,
});

const REGULAR = cycles('2026-03-01', [28, 29, 28, 27, 28, 29], 5);
// Eight gaps (the last 3 much longer than the 3 before them) and a last gap far from the mean.
const IRREGULAR = cycles('2026-01-01', [27, 28, 29, 28, 27, 30, 38, 45], 6);
const NIFAS_LOGS: Log[] = [
  ...cycles('2026-04-01', [29, 30], 5),
  { _id: 'n1', type: 'nifas', startDate: '2026-08-02', endDate: '2026-09-05' },
];

const seeds = {
  regular: (qc: QueryClient) => {
    qc.setQueryData(['cycle', 'summary', getTrackingDay()], summaryOf(REGULAR, notes(REGULAR)));
    qc.setQueryData(['cycle', 'bodyStats'], { heightCm: 165, weightKg: 62, bmi: 22.8 });
    qc.setQueryData(['fasting', 'summary', '2026-10-15'], {
      profile: { qadaOwed: 14, kaffarah: { active: false, targetDays: 0 }, vows: [] },
      qadaCompleted: 6,
    });
  },
  irregular: (qc: QueryClient) => {
    qc.setQueryData(['cycle', 'summary', getTrackingDay()], summaryOf(IRREGULAR, notes(IRREGULAR)));
    qc.setQueryData(['cycle', 'bodyStats'], { heightCm: 158, weightKg: 82, bmi: 32.8 });
  },
  empty: (qc: QueryClient) => {
    qc.setQueryData(['cycle', 'summary', getTrackingDay()], summaryOf([], []));
    qc.setQueryData(['cycle', 'bodyStats'], { heightCm: null, weightKg: null, bmi: null });
  },
  oneCycle: (qc: QueryClient) => {
    const logs = cycles('2026-10-10', [], 5, true);
    qc.setQueryData(['cycle', 'summary', getTrackingDay()], summaryOf(logs, notes(logs)));
    qc.setQueryData(['cycle', 'bodyStats'], { heightCm: 170, weightKg: 48, bmi: 16.6 });
  },
  nifas: (qc: QueryClient) => {
    qc.setQueryData(
      ['cycle', 'summary', getTrackingDay()],
      summaryOf(NIFAS_LOGS, notes(NIFAS_LOGS.filter((l) => l.type === 'hayd')), {
        pregnancy: { active: true, dueDate: '2027-02-01', weeksAlong: 20 },
      })
    );
    qc.setQueryData(['cycle', 'bodyStats'], { heightCm: 162, weightKg: 71, bmi: 27.1 });
    qc.setQueryData(['fasting', 'summary', '2026-10-15'], {
      profile: { qadaOwed: 3, kaffarah: { active: false, targetDays: 0 }, vows: [] },
      qadaCompleted: 9,
    });
  },
};

const i18n = createInstance();

beforeAll(async () => {
  await i18n.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    resources: {},
    interpolation: { escapeValue: false },
  });
  // A fixed "now": today, the tracking day and the fasting summary's date.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-15T08:00:00+06:00'));
});

afterAll(() => {
  vi.useRealTimers();
});

function render(
  el: ReactElement,
  user: { uid: string; gender: string } | null,
  seed: Array<(qc: QueryClient) => void> = []
): string {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  for (const s of seed) s(qc);
  session.user = user;
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

const SISTER = { uid: 'u1', gender: 'female' };
const page = () => createElement(CycleAnalytics);

const CASES: Array<[string, () => string]> = [
  ['regular', () => render(page(), SISTER, [seeds.regular])],
  ['irregular-alert-and-trend', () => render(page(), SISTER, [seeds.irregular])],
  ['empty', () => render(page(), SISTER, [seeds.empty])],
  ['one-ongoing-cycle', () => render(page(), SISTER, [seeds.oneCycle])],
  ['nifas-and-pregnancy', () => render(page(), SISTER, [seeds.nifas])],
  ['loading', () => render(page(), SISTER)],
  ['not-for-brothers', () => render(page(), { uid: 'u2', gender: 'male' }, [seeds.regular])],
  ['signed-out', () => render(page(), null)],
];

describe('CycleAnalytics renders the same HTML as before the split', () => {
  it.each(CASES)('%s', async (name, build) => {
    await expect(build()).toMatchFileSnapshot(`${DIR}/${name}.html`);
  });
});
