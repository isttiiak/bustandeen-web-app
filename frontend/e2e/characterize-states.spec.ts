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

test('salat analytics: a shorter range and a day opened', async ({ page }) => {
  await open(page, { as: 'brother' }, '/salat/analytics');
  await press(page, '7d');
  await expectBaseline(page, 'salat-analytics.7d');
  await press(page, '1y');
  await expectBaseline(page, 'salat-analytics.1y');
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
