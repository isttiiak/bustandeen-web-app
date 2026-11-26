import { createElement, type ReactElement } from 'react';
import { renderToString } from 'react-dom/server';
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

// zustand's server render ignores setState (it reads the initial state), so the
// admin role is mocked: AdminSadaqah picks the servant or ansar view from it.
const session = vi.hoisted(() => ({ role: 'servant' as 'servant' | 'ansar' }));
vi.mock('../store/useAdminStore.js', () => ({
  useAdminStore: (select: (s: { role: string }) => unknown) => select({ role: session.role }),
}));

import AdminSadaqah, {
  AnalyticsTab,
  DonorEmailAction,
  ExpensesTab,
  PendingCard,
  QuarterlyPublisher,
  SubmissionsTab,
} from './AdminSadaqah.js';
import type { Donation } from '../types/api.js';

// Audit P4-1: the admin panel is its own bundle with no demo and no signed-in
// session in e2e, so the browser baselines cannot reach AdminSadaqah. This
// renders each tab, for a servant and for an ansar, from seeded query data (no
// network) and compares the HTML with files recorded BEFORE the page was split.
// Handlers (verify, reject, confirm-twice deletes, publish) are not exercised
// here; adminScreens.test.ts still checks that they ask first.

const DIR = './adminSadaqahRender.baselines';

const donation = (over: Partial<Donation>): Donation => ({
  _id: 'd1',
  donorName: 'Amina Rahman',
  onBehalfOf: null,
  email: 'amina@example.com',
  phone: '01700000001',
  paymentMethod: 'bkash',
  transactionId: 'TRX100001',
  amount: 1500,
  transactionDate: '2026-10-12T00:00:00.000Z',
  message: null,
  showNamePublicly: true,
  isAnonymous: false,
  userId: null,
  status: 'pending',
  verifiedAt: null,
  verifiedBy: null,
  rejectionReason: null,
  createdAt: '2026-10-12T08:00:00.000Z',
  updatedAt: '2026-10-12T08:00:00.000Z',
  ...over,
});

const PENDING = [
  donation({}),
  donation({
    _id: 'd2',
    donorName: null,
    isAnonymous: true,
    onBehalfOf: 'my late father',
    paymentMethod: 'nagad',
    transactionId: 'TRX100002',
    amount: 500,
    message: 'May Allah accept it',
  }),
];
const ALL = [
  ...PENDING,
  donation({
    _id: 'd3',
    status: 'verified',
    verifiedAt: '2026-10-10T09:00:00.000Z',
    verifiedBy: 'servant@bustandeen.com',
    transactionId: 'TRX100003',
    amount: 2000,
  }),
  donation({
    _id: 'd4',
    donorName: 'Omar Faruq',
    status: 'rejected',
    verifiedBy: 'ansar@bustandeen.com',
    transactionId: 'TRX100004',
    amount: 100,
  }),
];

function seedSubmissions(qc: QueryClient) {
  qc.setQueryData(['admin', 'sadaqah', 'pending'], PENDING);
  qc.setQueryData(['admin', 'sadaqah', 'all', 'verified', 1, 100], {
    donations: [ALL[2]],
    total: 1,
    page: 1,
    limit: 100,
  });
  qc.setQueryData(['admin', 'sadaqah', 'all', 'any', 1, 20], {
    donations: ALL,
    total: 45,
    page: 1,
    limit: 20,
  });
  qc.setQueryData(['sadaqah', 'stats'], {
    ok: true,
    totalVerifiedAmount: 123456,
    totalVerifiedCount: 40,
    totalContributors: 25,
    lastUpdated: '2026-10-15T00:00:00.000Z',
    quarterlyBreakdown: [],
  });
}

function seedExpenses(qc: QueryClient) {
  qc.setQueryData(
    ['admin', 'sadaqah', 'expenses'],
    [
      {
        _id: 'e1',
        date: '2026-09-30T00:00:00.000Z',
        amount: 1200,
        description: 'Server hosting, September',
      },
      { _id: 'e2', date: '2026-10-05T00:00:00.000Z', amount: 800, description: 'Qari recording' },
    ]
  );
}

function seedAnalytics(qc: QueryClient) {
  qc.setQueryData(
    ['admin', 'sadaqah', 'quarterly'],
    [
      {
        quarter: '2026-Q3',
        received: 90000,
        spent: 40000,
        notes: 'Hosting and audio',
        published: true,
      },
      { quarter: '2026-Q4', received: 12000, spent: 3000, notes: '', published: false },
    ]
  );
  qc.setQueryData(['admin', 'sadaqah', 'donor-analytics'], {
    topDonors: [
      { email: 'amina@example.com', donationCount: 5, totalAmount: 7500, isAppUser: true },
      { email: 'omar@example.com', donationCount: 1, totalAmount: 100, isAppUser: false },
    ],
    repeatDonorCount: 3,
    oneOffDonorCount: 9,
    monthlyTrend: [
      { month: '2026-08', amount: 20000, count: 8 },
      { month: '2026-09', amount: 35000, count: 12 },
      { month: '2026-10', amount: 12000, count: 4 },
    ],
  });
}

const i18n = createInstance();

beforeAll(async () => {
  await i18n.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    resources: {},
    interpolation: { escapeValue: false },
  });
  // A fixed "now": "verified this month", the default quarter and the expense date.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-15T08:00:00+06:00'));
});

afterAll(() => {
  vi.useRealTimers();
});

function render(
  el: ReactElement,
  role: 'servant' | 'ansar',
  seed: Array<(qc: QueryClient) => void> = []
): string {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  for (const s of seed) s(qc);
  session.role = role;
  const html = renderToString(
    createElement(I18nextProvider, { i18n }, createElement(QueryClientProvider, { client: qc }, el))
  );
  // One tag per line, so a baseline diff points at the node.
  return html.replace(/></g, '>\n<') + '\n';
}

const CASES: Array<[string, () => string]> = [
  ['page-servant', () => render(createElement(AdminSadaqah), 'servant', [seedSubmissions])],
  ['page-ansar', () => render(createElement(AdminSadaqah), 'ansar', [seedSubmissions])],
  [
    'submissions-servant',
    () => render(createElement(SubmissionsTab, { isServant: true }), 'servant', [seedSubmissions]),
  ],
  [
    'submissions-ansar',
    () => render(createElement(SubmissionsTab, { isServant: false }), 'ansar', [seedSubmissions]),
  ],
  [
    'submissions-loading',
    () => render(createElement(SubmissionsTab, { isServant: true }), 'servant'),
  ],
  [
    'expenses-servant',
    () => render(createElement(ExpensesTab, { isServant: true }), 'servant', [seedExpenses]),
  ],
  [
    'expenses-ansar',
    () => render(createElement(ExpensesTab, { isServant: false }), 'ansar', [seedExpenses]),
  ],
  ['expenses-empty', () => render(createElement(ExpensesTab, { isServant: true }), 'servant')],
  [
    'analytics-servant',
    () => render(createElement(AnalyticsTab, { isServant: true }), 'servant', [seedAnalytics]),
  ],
  [
    'analytics-servant-empty',
    () => render(createElement(AnalyticsTab, { isServant: true }), 'servant'),
  ],
  [
    'analytics-ansar',
    () => render(createElement(AnalyticsTab, { isServant: false }), 'ansar', [seedAnalytics]),
  ],
  [
    'quarterly-publisher',
    () => render(createElement(QuarterlyPublisher), 'servant', [seedAnalytics]),
  ],
  ['pending-card', () => render(createElement(PendingCard, { donation: PENDING[1]! }), 'servant')],
  [
    'donor-email-action',
    () => render(createElement(DonorEmailAction, { email: 'amina@example.com' }), 'servant'),
  ],
];

describe('AdminSadaqah renders the same HTML as before the split', () => {
  it.each(CASES)('%s', async (name, build) => {
    await expect(build()).toMatchFileSnapshot(`${DIR}/${name}.html`);
  });
});
