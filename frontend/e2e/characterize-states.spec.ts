import { expect, test, type Page } from '@playwright/test';
import {
  AT,
  enterDemo,
  expectBaseline,
  expectText,
  go,
  outbox,
  type DemoOptions,
} from './characterize.js';

// Audit P4-1: the second half of the safety net. characterize.spec.ts dumps each
// page as it first opens; this file drives the handlers the refactor will move
// (dialogs, tabs, expanded cards) and, with the network off, records the exact
// request each write produced (the sync and salat outboxes). English only: the
// Bangla dump of the same page is already covered by characterize.spec.ts.

test.beforeEach(async ({ context }) => {
  await context.route(
    (url) => url.hostname !== 'localhost',
    (route) => route.abort()
  );
});

const button = (page: Page, name: string | RegExp, nth = 0) =>
  page.getByRole('button', { name, exact: typeof name === 'string' }).nth(nth);

/** The visit-counting banner sits over the page's lower edge; decline it first. */
async function declineBanner(page: Page) {
  const no = page.getByRole('button', { name: 'No thanks', exact: true });
  if (await no.isVisible()) {
    await no.click();
    await page.waitForTimeout(300);
  }
}

async function press(page: Page, name: string | RegExp, nth = 0) {
  await declineBanner(page);
  const b = button(page, name, nth);
  await expect(b).toBeVisible();
  await b.click();
  await page.waitForTimeout(400);
}

async function open(page: Page, o: DemoOptions, path: string) {
  await enterDemo(page, o);
  await go(page, path);
}

// A journey that began yesterday, and one past journey.
const JOURNEY = {
  bustandeen_musafir: JSON.stringify({
    active: true,
    startedAt: '2026-10-14',
    startAfter: 'fajr',
    destination: 'Chattogram',
    plannedStay: 3,
    school: 'majority',
  }),
  bustandeen_musafir_history: JSON.stringify([
    { from: '2026-09-02', to: '2026-09-05', destination: 'Sylhet', days: 4 },
  ]),
};

// ---- Salat tracker -------------------------------------------------------

test('salat: Done, Kaza and Miss, offline, write the same requests', async ({ page, context }) => {
  // Late evening: every prayer of the day has begun, so all three buttons show.
  await open(page, { as: 'brother', at: AT.night }, '/salat');
  await context.setOffline(true);
  await press(page, 'Done', 0); // Fajr
  await press(page, 'Kaza', 1); // Dhuhr (a finished prayer keeps its buttons)
  await expectBaseline(page, 'salat.done-kaza');
  expectText(await outbox(page), 'salat.done-kaza.outbox');
  await press(page, 'Miss', 2); // Asr
  await expectBaseline(page, 'salat.miss');
  expectText(await outbox(page), 'salat.miss.outbox');
});

test('salat: the details of a finished prayer open', async ({ page }) => {
  await open(page, { as: 'brother' }, '/salat');
  await press(page, 'Done', 0);
  await press(page, 'Details', 0);
  await expectBaseline(page, 'salat.details');
});

test('salat: on a journey (qasr, joining, Friday)', async ({ page }) => {
  await enterDemo(page, { as: 'brother', at: AT.day, storage: JOURNEY });
  await go(page, '/salat');
  await expectBaseline(page, 'salat.musafir');
});

test('salat: on a journey, Friday', async ({ page }) => {
  await enterDemo(page, { as: 'brother', at: AT.friday, storage: JOURNEY });
  await go(page, '/salat');
  await expectBaseline(page, 'salat.musafir-friday');
});

test('salat: on a journey, Hanafi view', async ({ page }) => {
  await enterDemo(page, {
    as: 'brother',
    at: AT.day,
    storage: {
      ...JOURNEY,
      bustandeen_musafir: JSON.stringify({
        active: true,
        startedAt: '2026-10-14',
        destination: 'Chattogram',
        school: 'hanafi',
      }),
    },
  });
  await go(page, '/salat');
  await expectBaseline(page, 'salat.musafir-hanafi');
});

// ---- Musafir -------------------------------------------------------------

test('musafir: the journey is set up', async ({ page }) => {
  await open(page, { as: 'brother' }, '/musafir');
  await press(page, 'Start my journey');
  await expectBaseline(page, 'musafir.setup');
});

test('musafir: a journey under way, with a past one', async ({ page }) => {
  await enterDemo(page, { as: 'brother', at: AT.day, storage: JOURNEY });
  await go(page, '/musafir');
  await expectBaseline(page, 'musafir.journey');
});

test('musafir: marking a du‘ā as said', async ({ page }) => {
  await enterDemo(page, { as: 'brother', at: AT.day, storage: JOURNEY });
  await go(page, '/musafir');
  await press(page, 'Mark as said', 0);
  await expectBaseline(page, 'musafir.dua-said');
});

// ---- Home ----------------------------------------------------------------

test('home: on a journey', async ({ page }) => {
  await enterDemo(page, { as: 'brother', at: AT.day, storage: JOURNEY });
  await expectBaseline(page, 'home.musafir');
});

test('home: Friday', async ({ page }) => {
  await enterDemo(page, { as: 'brother', at: AT.friday });
  await expectBaseline(page, 'home.friday');
});

test('home: in Ramadan', async ({ page }) => {
  await enterDemo(page, { as: 'brother', at: AT.ramadan });
  await expectBaseline(page, 'home.ramadan');
});

// ---- Home: every prayer window, the layouts, the goals card -------------------

const HOME_TIMES: Array<[string, string]> = [
  ['0558', '2026-10-15T05:58:00+06:00'], // just after sunrise: a forbidden time
  ['1000', '2026-10-15T10:00:00+06:00'], // after sunrise: Ishraq and Duha
  ['1137', '2026-10-15T11:37:00+06:00'], // the sun at its zenith: forbidden
  ['1540', '2026-10-15T15:40:00+06:00'], // ʿAṣr
  ['1720', '2026-10-15T17:20:00+06:00'], // just after sunset: forbidden, then Maghrib
  ['1750', '2026-10-15T17:50:00+06:00'], // Maghrib
  ['1900', '2026-10-15T19:00:00+06:00'], // ʿIshāʾ, the best time
  ['2350', '2026-10-15T23:50:00+06:00'], // ʿIshāʾ, close to Islamic midnight
  ['0040', '2026-10-16T00:40:00+06:00'], // after Islamic midnight, a Friday
  ['0330', '2026-10-16T03:30:00+06:00'], // Tahajjud time, a Friday
];

for (const [name, at] of HOME_TIMES) {
  test(`home: the prayer window at ${name}`, async ({ page }) => {
    await enterDemo(page, { as: 'brother', at });
    await expectBaseline(page, `home.at-${name}`);
  });
}

test('home: every quick section on', async ({ page }) => {
  await enterDemo(page, {
    as: 'sister',
    storage: { bustandeen_home_sections_off: '[]' },
  });
  await expectBaseline(page, 'home.all-sections');
});

test('home: a custom goals card (order, one row off, no badges)', async ({ page }) => {
  await enterDemo(page, {
    as: 'brother',
    storage: {
      bustandeen_home_sections_off: '[]',
      bustandeen_home_goals: JSON.stringify({
        on: true,
        order: ['fasting', 'quran', 'zikr', 'salat'],
        off: ['salat'],
        badges: false,
      }),
    },
  });
  await expectBaseline(page, 'home.goals-custom');
});

test('home: the goals card off', async ({ page }) => {
  await enterDemo(page, {
    as: 'brother',
    storage: {
      bustandeen_home_sections_off: '[]',
      bustandeen_home_goals: JSON.stringify({ on: false, off: [], badges: true }),
    },
  });
  await expectBaseline(page, 'home.goals-off');
});

test('home: no saved place asks for one', async ({ page }) => {
  await enterDemo(page, { as: 'brother', noLocation: true });
  await expectBaseline(page, 'home.no-location');
});

for (const layout of ['pills', 'full'] as const) {
  test(`home: Friday with the ${layout} special-day layout`, async ({ page }) => {
    await enterDemo(page, {
      as: 'brother',
      at: AT.friday,
      storage: { bustandeen_home_special: layout },
    });
    await expectBaseline(page, `home.friday-${layout}`);
  });
}

test('home: the setup card can be dismissed', async ({ page }) => {
  await enterDemo(page, { as: 'brother' });
  // (Not `press`: its banner helper would take "No thanks" for the visit-counting banner's.)
  await page.getByRole('button', { name: 'No thanks', exact: true }).click();
  await page.waitForTimeout(400);
  await expectBaseline(page, 'home.setup-dismissed');
});

test('home: the Ramadan pill on the fasting goal opens the tracker', async ({ page }) => {
  await enterDemo(page, { as: 'brother', storage: { bustandeen_home_sections_off: '[]' } });
  await declineBanner(page);
  await page
    .getByRole('button', { name: /Ramadan/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/ramadan$/);
  await expectBaseline(page, 'home.ramadan-pill-opens-tracker');
});

// ---- Rayhanah (cycle) ----------------------------------------------------

test('cycle: starting a period, then the pages that follow it', async ({ page }) => {
  await open(page, { as: 'sister' }, '/cycle');
  await press(page, 'My period started');
  await expectBaseline(page, 'cycle.start-dialog');
});

test('cycle: analytics, logging a past period', async ({ page }) => {
  await open(page, { as: 'sister' }, '/cycle/analytics');
  await press(page, 'Log a past period');
  await expectBaseline(page, 'cycle-analytics.past-dialog');
});

test('cycle analytics: editing a history entry', async ({ page }) => {
  await open(page, { as: 'sister' }, '/cycle/analytics');
  await press(page, 'Edit entry', 0);
  await expectBaseline(page, 'cycle-analytics.edit-dialog');
});

test('cycle analytics: deleting a history entry asks first', async ({ page }) => {
  await open(page, { as: 'sister' }, '/cycle/analytics');
  await press(page, 'Delete entry', 0);
  await expectBaseline(page, 'cycle-analytics.delete-confirm');
});

test('cycle analytics: a past nifas filled in and added', async ({ page }) => {
  await open(page, { as: 'sister' }, '/cycle/analytics');
  await press(page, 'Log a past period');
  await page.locator('#past-start').fill('2026-06-01');
  await page.locator('#past-end').fill('2026-06-20');
  await page.getByRole('button', { name: 'Nifās', exact: true }).click();
  await expectBaseline(page, 'cycle-analytics.past-filled');
  await press(page, 'Add to my history');
  await expectBaseline(page, 'cycle-analytics.past-added');
});

test('cycle analytics: the settings drawer', async ({ page }) => {
  await open(page, { as: 'sister' }, '/cycle/analytics');
  await press(page, 'Settings');
  await expectBaseline(page, 'cycle-analytics.settings-drawer');
});

test('cycle analytics: the CSV export has the same rows', async ({ page }) => {
  await open(page, { as: 'sister' }, '/cycle/analytics');
  await declineBanner(page);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  const file = await download;
  const { readFileSync } = await import('node:fs');
  expectText(
    `${file.suggestedFilename()}\n${readFileSync((await file.path())!, 'utf8')}`,
    'cycle-analytics.csv'
  );
});

// ---- Ramadan -------------------------------------------------------------

test('ramadan: a fast and a prayer, offline, write the same requests', async ({
  page,
  context,
}) => {
  await open(page, { as: 'brother', at: AT.ramadan }, '/ramadan');
  await context.setOffline(true);
  await press(page, 'I fasted today');
  await expectBaseline(page, 'ramadan.fasted');
  expectText(await outbox(page), 'ramadan.fasted.outbox');
  await press(page, 'Done', 0);
  await expectBaseline(page, 'ramadan.salat-done');
  expectText(await outbox(page), 'ramadan.salat-done.outbox');
});

// Audit P4-1 (PR 9, RamadanTracker): the live month in every part of its day.
// Dates are inside Ramadan 1448 (day 1 is 8 Feb 2027, so the 20th fast is 27 Feb).
const RAMADAN_AT = {
  beforeDawn: '2027-02-20T04:00:00+06:00',
  afterMaghrib: '2027-02-20T19:00:00+06:00',
  eveOfLastTen: '2027-02-27T19:30:00+06:00',
  lastTenDay: '2027-03-01T16:00:00+06:00',
};

test('ramadan: no saved place asks for one', async ({ page }) => {
  await open(page, { as: 'brother', at: AT.ramadan, noLocation: true }, '/ramadan');
  await expectBaseline(page, 'ramadan.no-place');
});

test('ramadan: before dawn counts down to the end of suhoor', async ({ page }) => {
  await open(page, { as: 'brother', at: RAMADAN_AT.beforeDawn }, '/ramadan');
  await expectBaseline(page, 'ramadan.before-dawn');
});

test('ramadan: after Maghrib the countdown rolls over to tomorrow', async ({ page }) => {
  await open(page, { as: 'brother', at: RAMADAN_AT.afterMaghrib }, '/ramadan');
  await expectBaseline(page, 'ramadan.after-maghrib');
});

test('ramadan: the eve of the last ten, the 21st night begins', async ({ page }) => {
  await open(page, { as: 'brother', at: RAMADAN_AT.eveOfLastTen }, '/ramadan');
  await expectBaseline(page, 'ramadan.eve-of-last-ten');
});

test('ramadan: a day in the last ten', async ({ page }) => {
  await open(page, { as: 'brother', at: RAMADAN_AT.lastTenDay }, '/ramadan');
  await expectBaseline(page, 'ramadan.last-ten-day');
});

test('ramadan: the eve of the last ten, in Bangla', async ({ page }) => {
  await open(page, { as: 'brother', at: RAMADAN_AT.eveOfLastTen, lang: 'bn' }, '/ramadan');
  await expectBaseline(page, 'ramadan.eve-of-last-ten.bn');
});

test('ramadan: the sister view', async ({ page }) => {
  await open(page, { as: 'sister', at: AT.ramadan }, '/ramadan');
  await expectBaseline(page, 'ramadan.sister');
});

test('ramadan: the preview flag pretends the month has begun', async ({ page }) => {
  await open(page, { as: 'brother' }, '/ramadan?preview=live');
  await expectBaseline(page, 'ramadan.preview-live');
});

test('ramadan: tarawih on the eve of the last ten is saved on the 21st fast', async ({
  page,
  context,
}) => {
  await open(page, { as: 'brother', at: RAMADAN_AT.eveOfLastTen }, '/ramadan');
  await context.setOffline(true);
  await press(page, /Tarawih/);
  await expectBaseline(page, 'ramadan.tarawih-marked');
  expectText(await outbox(page), 'ramadan.tarawih.outbox');
});

test('ramadan: a worship tile opens its tracker', async ({ page }) => {
  await open(page, { as: 'brother', at: AT.ramadan }, '/ramadan');
  await press(page, /Quran today/i);
  await expect(page).toHaveURL(/\/quran$/);
});

// ---- Prayer times --------------------------------------------------------

test('prayer times: the settings sheet', async ({ page }) => {
  await open(page, { as: 'brother' }, '/prayer-times?settings=1');
  await expectBaseline(page, 'prayer-times.settings');
});

test('prayer times: a timeline entry opens, and the sources', async ({ page }) => {
  await open(page, { as: 'brother' }, '/prayer-times');
  await declineBanner(page);
  await page.getByText('Tahajjud', { exact: true }).click();
  await page.waitForTimeout(400);
  await press(page, 'Sources');
  await expectBaseline(page, 'prayer-times.expanded');
});

// Audit P4-1 (PR 10, PrayerTimes): the timeline at every kind of moment, a place on
// another zone, a name that is only coordinates, a changed calculation method.
const PRAYER_TIMES_AT: Array<[string, string]> = [
  ...HOME_TIMES,
  ['1400', '2026-10-15T14:00:00+06:00'], // Dhuhr, the plain afternoon
];
for (const [name, at] of PRAYER_TIMES_AT) {
  test(`prayer times: the timeline at ${name}`, async ({ page }) => {
    await open(page, { as: 'brother', at }, '/prayer-times');
    await expectBaseline(page, `prayer-times.at-${name}`);
  });
}

test('prayer times: before dawn, in Bangla', async ({ page }) => {
  await open(page, { as: 'brother', at: '2026-10-16T03:30:00+06:00', lang: 'bn' }, '/prayer-times');
  await expectBaseline(page, 'prayer-times.at-0330.bn');
});

test('prayer times: no saved place asks for one', async ({ page }) => {
  await open(page, { as: 'brother', noLocation: true }, '/prayer-times');
  await expectBaseline(page, 'prayer-times.no-place');
});

test('prayer times: a place on another time zone shows its own clock', async ({ page }) => {
  await open(
    page,
    {
      as: 'brother',
      storage: {
        bustandeen_location: JSON.stringify({
          latitude: 51.5074,
          longitude: -0.1278,
          name: 'London',
        }),
      },
    },
    '/prayer-times'
  );
  await expectBaseline(page, 'prayer-times.london');
});

test('prayer times: a place saved as bare coordinates is renamed on the device', async ({
  page,
}) => {
  await open(
    page,
    {
      as: 'brother',
      storage: {
        bustandeen_location: JSON.stringify({
          latitude: 23.8103,
          longitude: 90.4125,
          name: '23.81, 90.41',
        }),
      },
    },
    '/prayer-times'
  );
  await page.waitForTimeout(800);
  await expectBaseline(page, 'prayer-times.raw-coordinates-name');
});

test('prayer times: an expanded forbidden time, then a nafl time', async ({ page }) => {
  await open(page, { as: 'brother' }, '/prayer-times');
  await declineBanner(page);
  await page.getByText('Forbidden: Around Sunrise', { exact: true }).click();
  await page.waitForTimeout(400);
  await expectBaseline(page, 'prayer-times.forbidden-open');
  await page.getByText('Salat al-Awwabin', { exact: true }).click();
  await page.waitForTimeout(400);
  await expectBaseline(page, 'prayer-times.awwabin-open');
  await page.getByText('Salat al-Awwabin', { exact: true }).click();
  await page.waitForTimeout(400);
  await expectBaseline(page, 'prayer-times.entry-closed');
});

test('prayer times: changing the calculation method recomputes when the sheet closes', async ({
  page,
}) => {
  await open(page, { as: 'brother' }, '/prayer-times?settings=1');
  await declineBanner(page);
  await page.getByLabel('Calculation method').selectOption({ index: 3 });
  await page.waitForTimeout(300);
  await press(page, 'Close prayer time settings');
  await page.waitForTimeout(500);
  await expectBaseline(page, 'prayer-times.method-changed');
});

test('prayer times: the Qibla link opens the compass', async ({ page }) => {
  await open(page, { as: 'brother' }, '/prayer-times');
  await declineBanner(page);
  await page.getByRole('link', { name: 'Qibla Compass' }).click();
  await expect(page).toHaveURL(/\/qibla$/);
});

// ---- Analytics -----------------------------------------------------------

test('zikr analytics: the goal and missed-count dialogs', async ({ page }) => {
  await open(page, { as: 'brother' }, '/zikr/analytics');
  await press(page, 'Edit Goal');
  await expectBaseline(page, 'zikr-analytics.goal-dialog');
});

test('zikr analytics: log missed counts', async ({ page }) => {
  await open(page, { as: 'brother' }, '/zikr/analytics');
  await press(page, 'Log Missed Counts');
  await expectBaseline(page, 'zikr-analytics.missed-dialog');
});

test('zikr analytics: a shorter range', async ({ page }) => {
  await open(page, { as: 'brother' }, '/zikr/analytics');
  await press(page, '7d');
  await expectBaseline(page, 'zikr-analytics.7d');
});

test('zikr analytics: the all-time breakdown, a year, and a chart explained', async ({ page }) => {
  await open(page, { as: 'brother' }, '/zikr/analytics');
  await press(page, 'All time');
  await press(page, '1y');
  await press(page, 'Zikr Trend');
  await expectBaseline(page, 'zikr-analytics.all-1y-info');
});

test('zikr analytics: the journey view', async ({ page }) => {
  await open(page, { as: 'brother' }, '/zikr/analytics');
  await press(page, 'Journey');
  await expectBaseline(page, 'zikr-analytics.journey');
});

test('zikr analytics: pausing the streak, and the settings drawer', async ({ page }) => {
  await open(page, { as: 'brother' }, '/zikr/analytics');
  await press(page, 'Pause Streak');
  await expectBaseline(page, 'zikr-analytics.streak-paused');
  await press(page, 'Zikr settings');
  await expectBaseline(page, 'zikr-analytics.settings-drawer');
});

test('zikr analytics: another day in the session history, and a heatmap cell', async ({ page }) => {
  await open(page, { as: 'brother' }, '/zikr/analytics');
  await declineBanner(page);
  await page.getByLabel('Choose a day').fill('2026-10-14');
  await page.waitForTimeout(400);
  await page.locator('[title^="2026-10-13"]').hover();
  await expectBaseline(page, 'zikr-analytics.day-and-heat');
});

test('zikr analytics: a new goal is saved', async ({ page }) => {
  await open(page, { as: 'brother' }, '/zikr/analytics');
  await press(page, 'Edit Goal');
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('spinbutton').fill('150');
  await dialog.getByRole('combobox').selectOption('2');
  await expectBaseline(page, 'zikr-analytics.goal-filled');
  await press(page, 'Save Goal');
  await expectBaseline(page, 'zikr-analytics.goal-saved');
});

test('zikr analytics: the CSV export has the same rows', async ({ page }) => {
  await open(page, { as: 'brother' }, '/zikr/analytics');
  await declineBanner(page);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'CSV' }).click();
  const file = await download;
  const { readFileSync } = await import('node:fs');
  expectText(
    `${file.suggestedFilename()}\n${readFileSync((await file.path())!, 'utf8')}`,
    'zikr-analytics.csv'
  );
});

test('salat analytics: a shorter range and a day opened', async ({ page }) => {
  await open(page, { as: 'brother' }, '/salat/analytics');
  await press(page, '7d');
  await expectBaseline(page, 'salat-analytics.7d');
  await press(page, '1y');
  await expectBaseline(page, 'salat-analytics.1y');
});

// Salat analytics: the controls, the month picker, the info dialogs, the journey
// view and a calendar day (which opens the tracker on that day).
test('salat analytics: a 90-day range', async ({ page }) => {
  await open(page, { as: 'brother' }, '/salat/analytics');
  // (Not "All": its 3,650 calendar cells animate in one after another for
  // about fifteen seconds, so the page has no settled state to record.)
  await press(page, '90d');
  await expectBaseline(page, 'salat-analytics.90d');
});

test('salat analytics: the month picker, and an earlier month', async ({ page }) => {
  await open(page, { as: 'brother' }, '/salat/analytics');
  await press(page, /Oct 2026/);
  await expectBaseline(page, 'salat-analytics.month-picker');
  await press(page, 'Sep');
  await expectBaseline(page, 'salat-analytics.month-sep');
});

test('salat analytics: the chart info dialogs', async ({ page }) => {
  await open(page, { as: 'brother' }, '/salat/analytics');
  for (const [name, file] of [
    ['By Day of Week', 'weekday'],
    ['Prayer Timing', 'timing'],
    ['Kaza Insights', 'kaza-insights'],
    ['Isha & Fajr Connection', 'correlation'],
    ['Prayer Calendar', 'calendar'],
  ] as const) {
    await press(page, name);
    await expectBaseline(page, `salat-analytics.info-${file}`);
    await page.getByRole('button', { name: 'Close', exact: true }).first().click();
    await page.waitForTimeout(400);
  }
});

test('salat analytics: the journey view and its info dialog', async ({ page }) => {
  await open(page, { as: 'brother' }, '/salat/analytics');
  await press(page, 'Journey');
  await expectBaseline(page, 'salat-analytics.journey');
  await press(page, 'Journey', 1);
  await expectBaseline(page, 'salat-analytics.journey-info');
});

test('salat analytics: a calendar day opens the tracker on that day', async ({ page }) => {
  await open(page, { as: 'brother' }, '/salat/analytics');
  await press(page, '2026-10-12: 5/5');
  await expect(page).toHaveURL(/\/salat\?date=2026-10-12/);
  await expectBaseline(page, 'salat-analytics.calendar-day-opens-salat');
});

// ---- Friends, Settings, Quran -------------------------------------------

test('friends: how Noor works', async ({ page }) => {
  await open(page, { as: 'sister' }, '/friends');
  await press(page, 'What is Noor?');
  await expectBaseline(page, 'friends.noor-how');
});

test('friends: the invite dialog opens from ?invite=1', async ({ page }) => {
  await open(page, { as: 'sister' }, '/friends?invite=1');
  await expectBaseline(page, 'friends.invite');
});

test('friends: the all-time board', async ({ page }) => {
  await open(page, { as: 'sister' }, '/friends');
  await declineBanner(page);
  await page.getByRole('tab', { name: 'All time', exact: true }).click();
  await page.waitForTimeout(400);
  await expectBaseline(page, 'friends.all-time');
});

test('settings: a delete confirmation, and a day-start explainer', async ({ page }) => {
  await open(page, { as: 'brother' }, '/settings');
  await press(page, 'More about Midnight');
  await expectBaseline(page, 'settings.day-start-info');
});

test('settings: the delete-all-zikr confirmation', async ({ page }) => {
  await open(page, { as: 'brother' }, '/settings');
  await press(page, 'Delete: All zikr data');
  await expectBaseline(page, 'settings.delete-confirm');
});

// Settings: every control the split will move. English only; the Bangla dump of
// the page as it opens is in characterize.spec.ts.
const radio = (page: Page, name: string | RegExp) =>
  page.getByRole('radio', { name, exact: typeof name === 'string' });

async function pick(page: Page, name: string | RegExp) {
  await declineBanner(page);
  await radio(page, name).click();
  await page.waitForTimeout(400);
}

async function toggle(page: Page, name: RegExp) {
  await declineBanner(page);
  // The switch itself is visually hidden; its label is what a finger taps.
  await page.locator('label', { hasText: name }).first().click();
  await page.waitForTimeout(400);
}

test('settings: theme, motion and Home layout choices', async ({ page }) => {
  await open(page, { as: 'brother' }, '/settings');
  await pick(page, /^Light/);
  await pick(page, 'Auto');
  await pick(page, /^Minimal/);
  await expectBaseline(page, 'settings.display-choices');
});

test('settings: the accessibility toggles', async ({ page }) => {
  await open(page, { as: 'brother' }, '/settings');
  await toggle(page, /High contrast/);
  await toggle(page, /Vibration feedback/);
  await expectBaseline(page, 'settings.accessibility');
});

test('settings: the day starts at midnight', async ({ page }) => {
  await open(page, { as: 'brother' }, '/settings');
  await press(page, /^Midnight/);
  await expectBaseline(page, 'settings.day-start-midnight');
});

test('settings: switching to Bangla', async ({ page }) => {
  await open(page, { as: 'brother' }, '/settings');
  await press(page, 'বাংলা (Bengali)');
  await expectBaseline(page, 'settings.language-bn');
});

test('settings: Musafir mode on from Settings', async ({ page }) => {
  await open(page, { as: 'brother' }, '/settings');
  await toggle(page, /travelling/);
  await expectBaseline(page, 'settings.musafir-on');
});

test('settings: Naseeh on shows the key box', async ({ page }) => {
  await open(page, { as: 'brother' }, '/settings');
  await toggle(page, /Enable Naseeh/);
  await expectBaseline(page, 'settings.naseeh-on');
});

test('settings: the saved location is cleared', async ({ page }) => {
  await open(page, { as: 'brother' }, '/settings');
  await press(page, 'Clear');
  await expectBaseline(page, 'settings.location-cleared');
});

test('settings: a danger row runs after its confirmation', async ({ page }) => {
  await open(page, { as: 'brother' }, '/settings');
  await press(page, 'Delete: All zikr data');
  await press(page, 'Yes, do it');
  await expectBaseline(page, 'settings.danger-run');
});

test('settings: delete account asks, then asks who you are', async ({ page }) => {
  await open(page, { as: 'brother' }, '/settings');
  await press(page, 'Delete account');
  await expectBaseline(page, 'settings.delete-account-confirm');
  await press(page, 'Yes, delete my account');
  await expectBaseline(page, 'settings.delete-account-reauth');
});

test('settings (sister): the cycle row of the danger zone', async ({ page }) => {
  await open(page, { as: 'sister' }, '/settings');
  await press(page, 'Delete: All cycle data');
  await expectBaseline(page, 'settings.sister-danger-confirm');
});

// ---- Quran reader: modes, navigation, writes, fullscreen ---------------------

test('quran reader: a surah read to its end offline credits the surah, then opens the next', async ({
  page,
  context,
}) => {
  await open(page, { as: 'brother' }, '/quran/read/112');
  await context.setOffline(true);
  for (let i = 0; i < 3; i++) await press(page, 'Next ayah');
  await expectBaseline(page, 'quran-reader.112-last-ayah');
  await press(page, 'Next ayah'); // "Next surah"
  await expect(page).toHaveURL(/\/quran\/read\/113\?mode=free/);
  await expectBaseline(page, 'quran-reader.113-after-112');
  expectText(await outbox(page), 'quran-reader.112-to-113.outbox');
});

test('quran reader: a batch of five is flushed, and Previous steps back', async ({
  page,
  context,
}) => {
  await open(page, { as: 'brother' }, '/quran/read/2');
  await context.setOffline(true);
  for (let i = 0; i < 6; i++) await press(page, 'Next ayah');
  await press(page, 'Previous ayah');
  await expectBaseline(page, 'quran-reader.2-after-six-next');
  expectText(await outbox(page), 'quran-reader.2-batch.outbox');
});

test('quran reader: the khatam journey reads in order and advances the bookmark', async ({
  page,
  context,
}) => {
  await open(page, { as: 'brother' }, '/quran/read/1?mode=khatam');
  await expectBaseline(page, 'quran-reader.khatam');
  await context.setOffline(true);
  for (let i = 0; i < 5; i++) await press(page, 'Next ayah');
  expectText(await outbox(page), 'quran-reader.khatam.outbox');
});

test('quran reader: a bundle shows no goal, and finishing returns to the Quran home', async ({
  page,
}) => {
  await open(page, { as: 'brother' }, '/quran/read/1?mode=bundle&start=2&end=4');
  await expectBaseline(page, 'quran-reader.bundle');
  for (let i = 0; i < 3; i++) await press(page, 'Next ayah');
  await page.waitForTimeout(1500);
  await expect(page).toHaveURL(/\/quran$/);
  await expectBaseline(page, 'quran-reader.bundle-finished');
});

test('quran reader: a duʿā with its story and evidence', async ({ page }) => {
  await open(
    page,
    { as: 'brother' },
    '/quran/read/2?mode=bundle&start=201&end=201&dua=dua-both-worlds'
  );
  await press(page, /Why this du/);
  await expectBaseline(page, 'quran-reader.dua-context');
});

test('quran reader: a single beloved surah finishes back to the Quran home', async ({ page }) => {
  await open(page, { as: 'brother' }, '/quran/read/112?mode=single');
  for (let i = 0; i < 4; i++) await press(page, 'Next ayah');
  await page.waitForTimeout(1500);
  await expect(page).toHaveURL(/\/quran$/);
});

test('quran reader: continue where you left off', async ({ page }) => {
  await enterDemo(page, {
    as: 'brother',
    storage: { bustandeen_reader_pos: JSON.stringify({ '2': 3 }) },
  });
  await go(page, '/quran/read/2');
  await expectBaseline(page, 'quran-reader.resume-prompt');
  await press(page, 'Continue');
  await expectBaseline(page, 'quran-reader.resume-continued');
});

test('quran reader: start over from the resume prompt', async ({ page }) => {
  await enterDemo(page, {
    as: 'brother',
    storage: { bustandeen_reader_pos: JSON.stringify({ '2': 3 }) },
  });
  await go(page, '/quran/read/2');
  await press(page, 'Start over');
  await expectBaseline(page, 'quran-reader.resume-started-over');
});

test('quran reader: zoom, volume, the jump menu and keyboard shortcuts', async ({ page }) => {
  await open(page, { as: 'brother' }, '/quran/read/1');
  await press(page, 'Zoom in');
  await press(page, 'Zoom in');
  await press(page, 'Volume');
  await declineBanner(page);
  await page.locator('#jump-ayah').selectOption('5');
  await page.waitForTimeout(300);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(300);
  await expectBaseline(page, 'quran-reader.zoom-volume-jump');
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(300);
  await press(page, 'Reset zoom');
  await expectBaseline(page, 'quran-reader.zoom-reset-left');
});

test('quran reader: bookmark an ayah and open the share dialog', async ({ page }) => {
  // The dialog offers "Share" only where the browser can share files (a Mac's Chrome
  // can, CI's Linux Chromium cannot), so pin it off to make the dump the same everywhere.
  await page.context().addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', { value: () => false, configurable: true });
  });
  await open(page, { as: 'brother' }, '/quran/read/1');
  await press(page, 'Bookmark this ayah');
  await expectBaseline(page, 'quran-reader.bookmarked');
  await press(page, 'Share as image');
  await expectBaseline(page, 'quran-reader.share-open');
});

test('quran reader: fullscreen with the tafsir beside the ayah', async ({ page }) => {
  await open(page, { as: 'brother' }, '/quran/read/1');
  await press(page, 'Fullscreen');
  await expectBaseline(page, 'quran-reader.fullscreen');
  await press(page, 'Read tafsir');
  await expectBaseline(page, 'quran-reader.fullscreen-tafsir');
  await press(page, 'Exit fullscreen');
  await expectBaseline(page, 'quran-reader.fullscreen-exited');
});

test('quran reader: the tafsir panel under the card', async ({ page }) => {
  await open(page, { as: 'brother' }, '/quran/read/1');
  await press(page, 'Tafsir', 0);
  await expectBaseline(page, 'quran-reader.tafsir-panel');
});

test('quran reader: the next ayah, offline, writes the same requests', async ({
  page,
  context,
}) => {
  await open(page, { as: 'brother' }, '/quran/read/1');
  await context.setOffline(true);
  await press(page, 'Next ayah');
  await press(page, 'Next ayah');
  await expectBaseline(page, 'quran-reader.next-next');
  expectText(await outbox(page), 'quran-reader.next-next.outbox');
});
