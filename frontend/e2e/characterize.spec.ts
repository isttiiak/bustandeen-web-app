import { test } from '@playwright/test';
import { AT, enterDemo, expectBaseline, go, type DemoOptions } from './characterize.js';

// Audit P4-1: the baselines for the 13 big pages, taken BEFORE they are split.
// Every page is dumped in English and Bangla, in demo mode, with a frozen clock.
// After an extraction the dumps must be byte-identical:
//   npx playwright test characterize          (must pass untouched)
// A baseline is only ever regenerated (--update-snapshots) on purpose, in a PR
// whose job is to change what the page renders. AdminSadaqah is not here: the
// admin panel is its own bundle and has no demo.

test.beforeEach(async ({ context }) => {
  await context.route(
    (url) => url.hostname !== 'localhost',
    (route) => route.abort()
  );
});

interface PageCase {
  name: string;
  path: string;
  as: DemoOptions['as'];
  at?: string;
}

const PAGES: PageCase[] = [
  { name: 'home-brother', path: '/', as: 'brother' },
  { name: 'home-sister', path: '/', as: 'sister' },
  { name: 'salat', path: '/salat', as: 'brother' },
  { name: 'salat-friday', path: '/salat', as: 'brother', at: AT.friday },
  { name: 'salat-analytics', path: '/salat/analytics', as: 'brother' },
  { name: 'zikr-analytics', path: '/zikr/analytics', as: 'brother' },
  { name: 'quran-reader', path: '/quran/read/1', as: 'brother' },
  { name: 'prayer-times', path: '/prayer-times', as: 'brother' },
  { name: 'musafir', path: '/musafir', as: 'brother' },
  { name: 'ramadan', path: '/ramadan', as: 'brother' },
  { name: 'ramadan-in-ramadan', path: '/ramadan', as: 'brother', at: AT.ramadan },
  { name: 'cycle', path: '/cycle', as: 'sister' },
  { name: 'cycle-analytics', path: '/cycle/analytics', as: 'sister' },
  { name: 'friends', path: '/friends', as: 'sister' },
  { name: 'settings-brother', path: '/settings', as: 'brother' },
  { name: 'settings-sister', path: '/settings', as: 'sister' },
];

for (const c of PAGES) {
  for (const lang of ['en', 'bn'] as const) {
    test(`${c.name} (${lang})`, async ({ page }) => {
      await enterDemo(page, { as: c.as, at: c.at, lang });
      await go(page, c.path);
      await expectBaseline(page, `${c.name}.${lang}`);
    });
  }
}
