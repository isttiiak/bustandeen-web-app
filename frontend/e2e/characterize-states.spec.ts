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

// Audit P4-1 (PR 11, RayhanahCycle): the quiet page's dialogs and switches. The demo
// keeps no started period, so the pages with one are baselined by the server render
// in src/pages/rayhanahRender.test.ts.
test('cycle: a nifas start, begun offline, writes one request', async ({ page, context }) => {
  await open(page, { as: 'sister' }, '/cycle');
  await context.setOffline(true);
  await press(page, 'My period started');
  await press(page, 'Post-natal (nifās)');
  await expectBaseline(page, 'cycle.start-nifas-chosen');
  await press(page, 'Begin Rayhanah days');
  await expectBaseline(page, 'cycle.start-nifas-queued');
  expectText(await outbox(page), 'cycle.start-nifas.outbox');
});

test('cycle: the pregnancy switch asks for a due date, then saves it offline', async ({
  page,
  context,
}) => {
  await open(page, { as: 'sister' }, '/cycle');
  await context.setOffline(true);
  await declineBanner(page);
  await page.getByRole('switch', { name: "I'm currently pregnant" }).click();
  await page.waitForTimeout(300);
  await expectBaseline(page, 'cycle.pregnancy-form');
  await page.getByLabel('Expected due date').fill('2027-02-10');
  await press(page, 'Save');
  await expectBaseline(page, 'cycle.pregnancy-saved');
  expectText(await outbox(page), 'cycle.pregnancy.outbox');
});

test('cycle: the share switch opens the friend picker, and cancel closes it', async ({ page }) => {
  await open(page, { as: 'sister' }, '/cycle');
  await declineBanner(page);
  await page.getByRole('switch', { name: 'Share cycle status' }).click();
  await page.waitForTimeout(400);
  await expectBaseline(page, 'cycle.share-picker');
  await press(page, 'Cancel');
  await expectBaseline(page, 'cycle.share-picker-closed');
});

test('cycle: the settings drawer opens from the cog', async ({ page }) => {
  await open(page, { as: 'sister' }, '/cycle');
  await press(page, 'Settings');
  await expectBaseline(page, 'cycle.settings-drawer');
});

test('cycle: the istihada guide opens', async ({ page }) => {
  await open(page, { as: 'sister' }, '/cycle');
  await declineBanner(page);
  await page.getByText('What is istiḥāḍa?').click();
  await page.waitForTimeout(300);
  await expectBaseline(page, 'cycle.istihada-open');
});

test('cycle: the Analytics tab opens the analytics', async ({ page }) => {
  await open(page, { as: 'sister' }, '/cycle');
  await declineBanner(page);
  await page.getByRole('link', { name: 'Analytics' }).first().click();
  await expect(page).toHaveURL(/\/cycle\/analytics$/);
});

test('cycle: a brother is shown the gentle gate', async ({ page }) => {
  await open(page, { as: 'brother' }, '/cycle');
  await expectBaseline(page, 'cycle.brother-gate');
});

// ---- Rayhanah with a started period (audit P4-1, PR 12) ------------------------
// The demo keeps no started period, so these tests rewrite the demo's cycle summary
// in the built script before it runs (the page code itself is untouched). The
// writes are made offline and compared as the requests they queue.
test.describe('cycle with a period', () => {
  test.use({ serviceWorkers: 'block' });

  const ACTIVE = (start: string, day = 3, beyond = false) =>
    `{type:\`hayd\`,startDate:\`${start}\`,dayCount:${day},maxDays:15,beyondMax:${beyond ? '!0' : '!1'}}`;

  async function rewriteDemoCycle(
    page: Page,
    o: { active?: string; pregnant?: boolean; endedRecently?: boolean }
  ) {
    if (!o.active && !o.pregnant && !o.endedRecently) return;
    await page.route('**/assets/*.js', async (route) => {
      const res = await route.fetch();
      let body = await res.text();
      if (body.includes('basedOnCycles:4')) {
        const before = body;
        if (o.active)
          body = body.replace('active:null,partnerSync', `active:${o.active},partnerSync`);
        if (o.pregnant)
          body = body.replace(
            'pregnancy:{active:!1,dueDate:null,weeksAlong:null}',
            'pregnancy:{active:!0,dueDate:`2027-02-10`,weeksAlong:20}'
          );
        if (o.endedRecently)
          body = body.replace(
            'startDate:v(36),endDate:v(30)',
            'startDate:`2026-10-08`,endDate:`2026-10-13`'
          );
        if (body === before)
          throw new Error('the demo cycle summary was not found in the built script');
      }
      await route.fulfill({ response: res, body });
    });
  }

  async function openCycle(
    page: Page,
    o: Parameters<typeof rewriteDemoCycle>[1],
    demo: Partial<DemoOptions> = {}
  ) {
    await rewriteDemoCycle(page, o);
    await open(page, { as: 'sister', ...demo }, '/cycle');
  }

  test('an active period (English)', async ({ page }) => {
    await openCycle(page, { active: ACTIVE('2026-10-13') });
    await expectBaseline(page, 'cycle.active');
  });

  test('an active period (Bangla)', async ({ page }) => {
    await openCycle(page, { active: ACTIVE('2026-10-13') }, { lang: 'bn' });
    await expectBaseline(page, 'cycle.active.bn');
  });

  test('a period past the maximum shows the istihada note', async ({ page }) => {
    await openCycle(page, { active: ACTIVE('2026-09-29', 17, true) });
    await expectBaseline(page, 'cycle.active-beyond-max');
  });

  test('a pregnancy shows the week and the due date', async ({ page }) => {
    await openCycle(page, { pregnant: true });
    await expectBaseline(page, 'cycle.pregnant');
  });

  test('turning the pregnancy switch off writes one request', async ({ page, context }) => {
    await openCycle(page, { pregnant: true });
    await context.setOffline(true);
    await declineBanner(page);
    await page.getByRole('switch', { name: "I'm currently pregnant" }).click();
    await page.waitForTimeout(300);
    expectText(await outbox(page), 'cycle.pregnancy-off.outbox');
  });

  test('a garden item is ticked, then a flow, a symptom and a mood', async ({ page, context }) => {
    await openCycle(page, { active: ACTIVE('2026-10-13') });
    await context.setOffline(true);
    await press(page, /Mark Morning & evening adhkār/);
    await expectBaseline(page, 'cycle.garden-ticked');
    await press(page, 'Medium');
    await press(page, 'Cramps');
    await press(page, 'Calm');
    await expectBaseline(page, 'cycle.note-chips');
    expectText(await outbox(page), 'cycle.note-chips.outbox');
  });

  test('going back a day edits that day, and back to today returns', async ({ page, context }) => {
    await openCycle(page, { active: ACTIVE('2026-10-13') });
    await context.setOffline(true);
    await press(page, 'Previous day');
    await expectBaseline(page, 'cycle.day-back-one');
    await press(page, 'Heavy');
    expectText(await outbox(page), 'cycle.day-back-one.outbox');
    await press(page, 'Previous day');
    await expectBaseline(page, 'cycle.day-back-to-start');
    await press(page, 'Back to today');
    await expectBaseline(page, 'cycle.day-back-to-today');
  });

  test('ending the period opens the ghusl guide', async ({ page, context }) => {
    await openCycle(page, { active: ACTIVE('2026-10-13') });
    await context.setOffline(true);
    await press(page, 'My period has ended');
    await expectBaseline(page, 'cycle.ghusl-open');
    await press(page, /Make the intention/);
    await press(page, /Wash both hands/);
    await expectBaseline(page, 'cycle.ghusl-two-steps');
    expectText(await outbox(page), 'cycle.end-period.outbox');
    await press(page, 'Alhamdulillah');
    await expectBaseline(page, 'cycle.ghusl-closed');
  });

  test('a period that fell in Ramadan offers to add the days to qada', async ({
    page,
    context,
  }) => {
    await openCycle(page, { active: ACTIVE('2027-02-18') }, { at: AT.ramadan });
    await context.setOffline(true);
    await press(page, 'My period has ended');
    await press(page, 'Alhamdulillah');
    await expectBaseline(page, 'cycle.qada-prompt');
    await press(page, 'Add to qaḍā');
    await expectBaseline(page, 'cycle.qada-added');
    expectText(await outbox(page), 'cycle.qada-added.outbox');
  });

  test('the qada prompt can be dismissed with Not now', async ({ page, context }) => {
    await openCycle(page, { active: ACTIVE('2027-02-18') }, { at: AT.ramadan });
    await context.setOffline(true);
    await press(page, 'My period has ended');
    await press(page, 'Alhamdulillah');
    await press(page, 'Not now');
    await expectBaseline(page, 'cycle.qada-dismissed');
  });

  test('a period ended two days ago can be reopened', async ({ page, context }) => {
    await openCycle(page, { endedRecently: true });
    await expectBaseline(page, 'cycle.ended-recently');
    await context.setOffline(true);
    await press(page, "I'm not done yet");
    expectText(await outbox(page), 'cycle.reopen.outbox');
  });

  test('an old local Garden checklist is moved up once, then cleared', async ({
    page,
    context,
  }) => {
    await rewriteDemoCycle(page, { active: ACTIVE('2026-10-13') });
    await enterDemo(page, { as: 'sister' });
    await context.setOffline(true);
    await page.evaluate(() => {
      localStorage.setItem(
        'bustandeen_rayhanah_garden_2026-10-15',
        JSON.stringify({ adhkar: true, dhikr: true, istighfar: false })
      );
      localStorage.setItem(
        'bustandeen_rayhanah_garden_2026-10-14',
        JSON.stringify({ kindness: true })
      );
    });
    await go(page, '/cycle');
    await page.waitForTimeout(500);
    expectText(
      await page.evaluate(
        () =>
          Object.keys(localStorage)
            .filter((k) => k.startsWith('bustandeen_rayhanah_garden_'))
            .join('\n') || '(none left)'
      ),
      'cycle.legacy-garden.keys-left'
    );
    expectText(await outbox(page), 'cycle.legacy-garden.outbox');
    await expectBaseline(page, 'cycle.legacy-garden');
  });

  test('the start dialog: a chosen date is sent, and a backdrop tap closes it', async ({
    page,
    context,
  }) => {
    await openCycle(page, {});
    await context.setOffline(true);
    await press(page, 'My period started');
    await page.getByLabel('Start date').fill('2026-10-10');
    await press(page, 'Begin Rayhanah days');
    expectText(await outbox(page), 'cycle.start-hayd-dated.outbox');
    await press(page, 'My period started');
    await page.mouse.click(5, 5);
    await page.waitForTimeout(400);
    await expectBaseline(page, 'cycle.start-backdrop-closed');
  });
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

// Audit P4-1 (PR 13, MusafirMode): the form, the journey's edits, coming home, deleting a
// past journey and the evidence cards. The journey lives in localStorage, so each
// write is compared as the storage it leaves behind.
const musafirStorage = (page: Page) =>
  page.evaluate(() =>
    JSON.stringify(
      Object.fromEntries(
        Object.keys(localStorage)
          .filter((k) => k.startsWith('bustandeen_musafir'))
          .sort()
          .map((k) => [k, localStorage.getItem(k)])
      ),
      null,
      1
    )
  );

const HANAFI_LONG_STAY = {
  bustandeen_musafir: JSON.stringify({
    active: true,
    startedAt: '2026-10-14',
    startAfter: 'fajr',
    destination: 'Chattogram',
    plannedStay: 20,
    school: 'hanafi',
  }),
};

test('musafir: a journey under way, in Bangla', async ({ page }) => {
  await enterDemo(page, { as: 'brother', at: AT.day, lang: 'bn', storage: JOURNEY });
  await go(page, '/musafir');
  await expectBaseline(page, 'musafir.journey.bn');
});

test('musafir: a Hanafi long stay is a resident, and prayers may not be joined', async ({
  page,
}) => {
  await enterDemo(page, { as: 'brother', at: AT.day, storage: HANAFI_LONG_STAY });
  await go(page, '/musafir');
  await expectBaseline(page, 'musafir.hanafi-resident');
});

test('musafir: starting a journey with chosen options saves it', async ({ page }) => {
  await open(page, { as: 'brother' }, '/musafir');
  await press(page, 'Start my journey');
  await page.getByPlaceholder(/Makkah/).fill('Sylhet');
  await press(page, /Asr/);
  await press(page, '5 days');
  await expectBaseline(page, 'musafir.form-filled');
  // A date older than the 60 days allowed is ignored.
  await page.locator('input[type="date"]').fill('2026-07-01');
  await expectBaseline(page, 'musafir.form-filled'); // unchanged
  await press(page, /Bismillah/);
  await expectBaseline(page, 'musafir.started');
  expectText(await musafirStorage(page), 'musafir.started.storage');
});

test('musafir: the form can be cancelled', async ({ page }) => {
  await open(page, { as: 'brother' }, '/musafir');
  await press(page, 'Start my journey');
  await press(page, 'Cancel');
  await expectBaseline(page, 'musafir.form-cancelled');
});

test('musafir: editing a journey (the change link) saves the new values', async ({ page }) => {
  await enterDemo(page, { as: 'brother', at: AT.day, storage: JOURNEY });
  await go(page, '/musafir');
  await press(page, 'change');
  await expectBaseline(page, 'musafir.edit-open');
  await page.getByPlaceholder(/Makkah/).fill('Cox’s Bazar');
  await press(page, /Hanafi|Ḥanafī/);
  await press(page, 'Save');
  await expectBaseline(page, 'musafir.edit-saved');
  expectText(await musafirStorage(page), 'musafir.edit-saved.storage');
});

test('musafir: "I’m home" asks, then ends the journey and welcomes you back', async ({ page }) => {
  await enterDemo(page, { as: 'brother', at: AT.day, storage: JOURNEY });
  await go(page, '/musafir');
  await press(page, 'I’m home');
  await expectBaseline(page, 'musafir.home-confirm');
  await press(page, 'Cancel');
  await expectBaseline(page, 'musafir.journey'); // back to the journey as it was
  await press(page, 'I’m home');
  await press(page, 'Yes, I’m home');
  await expectBaseline(page, 'musafir.welcome-home');
  expectText(await musafirStorage(page), 'musafir.welcome-home.storage');
  await press(page, 'Close');
  await expectBaseline(page, 'musafir.welcome-closed');
});

test('musafir: removing a past journey asks first', async ({ page }) => {
  await enterDemo(page, { as: 'brother', at: AT.day, storage: JOURNEY });
  await go(page, '/musafir');
  await press(page, 'Remove this journey');
  await expectBaseline(page, 'musafir.delete-confirm');
  await press(page, 'Cancel');
  expectText(await musafirStorage(page), 'musafir.delete-cancelled.storage');
  await press(page, 'Remove this journey');
  await press(page, 'Remove', 0);
  await expectBaseline(page, 'musafir.deleted');
  expectText(await musafirStorage(page), 'musafir.deleted.storage');
});

test('musafir: every du‘ā marked said, then one opened', async ({ page }) => {
  await enterDemo(page, { as: 'brother', at: AT.day, storage: JOURNEY });
  await go(page, '/musafir');
  await declineBanner(page);
  const marks = page.getByRole('button', { name: 'Mark as said' });
  for (let i = (await marks.count()) - 1; i >= 0; i--) await marks.nth(i).click();
  await page.waitForTimeout(400);
  await expectBaseline(page, 'musafir.all-duas-said');
  expectText(await musafirStorage(page), 'musafir.all-duas-said.storage');
  await page
    .getByRole('button', { name: /on return/ })
    .first()
    .click();
  await page.waitForTimeout(300);
  await expectBaseline(page, 'musafir.dua-other-open');
});

test('musafir: a concession card opens with its evidence, and closes', async ({ page }) => {
  await enterDemo(page, { as: 'brother', at: AT.day, storage: JOURNEY });
  await go(page, '/musafir');
  await declineBanner(page);
  const cards = page.locator('button[aria-expanded]').filter({ hasText: /./ });
  const rulings = page.getByRole('heading', { name: /traveller’s concessions/ });
  await rulings.scrollIntoViewIfNeeded();
  const first = page
    .locator('section')
    .filter({ has: rulings })
    .locator('button[aria-expanded]')
    .first();
  await first.click();
  await page.waitForTimeout(400);
  await expectBaseline(page, 'musafir.ruling-open');
  await first.click();
  await page.waitForTimeout(400);
  await expectBaseline(page, 'musafir.ruling-closed');
  void cards;
});

test('musafir: the Log prayers link opens the Salat tracker', async ({ page }) => {
  await enterDemo(page, { as: 'brother', at: AT.day, storage: JOURNEY });
  await go(page, '/musafir');
  await declineBanner(page);
  await page.getByRole('link', { name: /Log today’s prayers/ }).click();
  await expect(page).toHaveURL(/\/salat$/);
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

// Audit P4-1 (PR 14 onwards, SalatTracker): the prayer cards at every kind of moment, and
// what each card shows besides its buttons (adhkar, Tarawih, joining, the Hanafi note,
// the travel sunnah, the sunnah guidance, the Witr reminder).
const SALAT_TIMES: Array<[string, string]> = [
  ['0450', '2026-10-15T04:50:00+06:00'], // Fajr, adhkar window open
  ...HOME_TIMES,
  ['1200', '2026-10-15T12:00:00+06:00'], // Dhuhr
  ['1400', '2026-10-15T14:00:00+06:00'], // Dhuhr, later
];
for (const [name, at] of SALAT_TIMES) {
  test(`salat: the cards at ${name}`, async ({ page }) => {
    await open(page, { as: 'brother', at }, '/salat');
    await expectBaseline(page, `salat.at-${name}`);
  });
}

test('salat: before dawn, in Bangla', async ({ page }) => {
  await open(page, { as: 'brother', at: '2026-10-16T04:50:00+06:00', lang: 'bn' }, '/salat');
  await expectBaseline(page, 'salat.at-0450.bn');
});

test('salat: with no saved place there are no times and no current prayer', async ({ page }) => {
  await open(page, { as: 'brother', noLocation: true }, '/salat');
  await expectBaseline(page, 'salat.no-place');
});

test('salat: the sunnah and nafl guidance and the adhkar can be switched off', async ({ page }) => {
  await open(
    page,
    {
      as: 'brother',
      at: '2026-10-15T04:50:00+06:00',
      storage: {
        bustandeen_show_sunnah_guide: '0',
        bustandeen_show_nafl_guide: '0',
        bustandeen_salat_adhkar: '0',
      },
    },
    '/salat'
  );
  await expectBaseline(page, 'salat.guidance-off');
});

test('salat: Tarawih shows after Isha in Ramadan and is saved on the fast', async ({
  page,
  context,
}) => {
  await open(page, { as: 'brother', at: '2027-02-20T20:00:00+06:00' }, '/salat');
  await expectBaseline(page, 'salat.ramadan-isha');
  await context.setOffline(true);
  await press(page, /Tarawih tonight/);
  expectText(await outbox(page), 'salat.tarawih.outbox');
});

test('salat: a journey at Dhuhr offers to join Dhuhr and Asr, and the tap logs both', async ({
  page,
  context,
}) => {
  await enterDemo(page, { as: 'brother', at: '2026-10-15T12:00:00+06:00', storage: JOURNEY });
  await go(page, '/salat');
  await expectBaseline(page, 'salat.journey-dhuhr-offer');
  await context.setOffline(true);
  await press(page, /Dhuhr \+ Asr/);
  await expectBaseline(page, 'salat.journey-joined-taqdim');
  expectText(await outbox(page), 'salat.journey-joined-taqdim.outbox');
});

test('salat: a journey at Asr with Dhuhr unprayed offers joining in Asr time', async ({
  page,
  context,
}) => {
  await enterDemo(page, { as: 'brother', at: '2026-10-15T15:40:00+06:00', storage: JOURNEY });
  await go(page, '/salat');
  // The demo has Dhuhr done already: no offer. Un-marking it makes Asr time's offer appear.
  await expectBaseline(page, 'salat.journey-asr-no-offer');
  await context.setOffline(true);
  await press(page, 'Done', 1);
  await expectBaseline(page, 'salat.journey-asr-offer');
  await press(page, /Dhuhr \+ Asr/);
  expectText(await outbox(page), 'salat.journey-joined-takhir.outbox');
  await expectBaseline(page, 'salat.journey-joined-takhir');
});

test('salat: on a journey at Maghrib, joining Maghrib and Isha is offered', async ({ page }) => {
  await enterDemo(page, { as: 'brother', at: '2026-10-15T17:50:00+06:00', storage: JOURNEY });
  await go(page, '/salat');
  await expectBaseline(page, 'salat.journey-maghrib-offer');
});

test('salat: Hanafi at Dhuhr says joining is not part of the view, and can switch the view', async ({
  page,
}) => {
  await enterDemo(page, {
    as: 'brother',
    at: '2026-10-15T12:00:00+06:00',
    storage: {
      bustandeen_musafir: JSON.stringify({
        active: true,
        startedAt: '2026-10-14',
        startAfter: 'fajr',
        destination: 'Chattogram',
        plannedStay: 3,
        school: 'hanafi',
      }),
    },
  });
  await go(page, '/salat');
  await expectBaseline(page, 'salat.journey-hanafi-note');
  await press(page, /Follow the majority view/);
  await expectBaseline(page, 'salat.journey-hanafi-switched');
  expectText(await musafirStorage(page), 'salat.journey-hanafi-switched.storage');
});

test('salat: a journey shows the light travel sunnah and "prayed as" choices', async ({ page }) => {
  await enterDemo(page, { as: 'brother', at: '2026-10-15T19:00:00+06:00', storage: JOURNEY });
  await go(page, '/salat');
  await press(page, 'Done', 4); // Isha
  await expectBaseline(page, 'salat.journey-isha-done');
});

test.describe('salat during a Rayhanah period', () => {
  test.use({ serviceWorkers: 'block' });

  test.beforeEach(async ({ page }) => {
    await page.route('**/assets/*.js', async (route) => {
      const res = await route.fetch();
      let body = await res.text();
      if (body.includes('basedOnCycles:4')) {
        const before = body;
        body = body.replace(
          'active:null,partnerSync',
          'active:{type:`hayd`,startDate:`2026-10-13`,dayCount:3,maxDays:15,beyondMax:!1},partnerSync'
        );
        if (body === before) throw new Error('the demo cycle summary was not found');
      }
      await route.fulfill({ response: res, body });
    });
  });

  test('the day is excused', async ({ page }) => {
    await open(page, { as: 'sister' }, '/salat');
    await expectBaseline(page, 'salat.excused-today');
  });

  test('a day before the period is not', async ({ page }) => {
    await enterDemo(page, { as: 'sister' });
    await page.evaluate(() => {
      window.history.pushState({}, '', '/salat?date=2026-10-12');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await page.waitForTimeout(600);
    await expectBaseline(page, 'salat.before-the-period');
  });
});

// Audit P4-1 (PR 15, SalatTracker): what the prayer card's own controls do. Each write is
// compared as the requests it queues (offline) and the toasts and badges it leaves.
const dhikrStorage = (page: Page) =>
  page.evaluate(() =>
    JSON.stringify(
      Object.fromEntries(
        Object.keys(localStorage)
          .filter((k) => /dhikr|credit/i.test(k))
          .sort()
          .map((k) => [k, localStorage.getItem(k)])
      ),
      null,
      1
    )
  );

const ASR_NOW = '2026-10-15T15:40:00+06:00'; // Asr has begun and the demo has not logged it yet

test('salat: where a prayer was prayed is saved, with the congregation toast', async ({
  page,
  context,
}) => {
  await open(page, { as: 'brother', at: ASR_NOW }, '/salat');
  await context.setOffline(true);
  await press(page, 'Done', 2);
  await expectBaseline(page, 'salat.sub-tags-open');
  await press(page, /At Mosque/);
  await expectBaseline(page, 'salat.location-mosque');
  expectText(await outbox(page), 'salat.location-mosque.outbox');
  await press(page, /In Jamat/);
  await expectBaseline(page, 'salat.location-jamat');
  expectText(await outbox(page), 'salat.location-jamat.outbox');
});

test('salat: tasbeeh and Ayatul Kursi mark a prayer and credit the dhikr', async ({
  page,
  context,
}) => {
  await open(page, { as: 'brother', at: ASR_NOW }, '/salat');
  await context.setOffline(true);
  await press(page, 'Done', 2);
  await press(page, 'Tasbeeh');
  await expectBaseline(page, 'salat.tasbeeh-on');
  await press(page, 'Ayatul Kursi');
  await expectBaseline(page, 'salat.ayatul-kursi-on');
  expectText(await outbox(page), 'salat.tasbeeh-kursi.outbox');
  expectText(await dhikrStorage(page), 'salat.tasbeeh-kursi.dhikr-storage');
  await press(page, 'Tasbeeh');
  await expectBaseline(page, 'salat.tasbeeh-off');
  expectText(await dhikrStorage(page), 'salat.tasbeeh-off.dhikr-storage');
});

test('salat: with auto-count off, the tag is marked but nothing is counted', async ({
  page,
  context,
}) => {
  await open(
    page,
    { as: 'brother', at: ASR_NOW, storage: { bustandeen_salat_auto_count: '0' } },
    '/salat'
  );
  await context.setOffline(true);
  await press(page, 'Done', 2);
  await press(page, 'Tasbeeh');
  await expectBaseline(page, 'salat.tasbeeh-no-auto-count');
  expectText(await dhikrStorage(page), 'salat.tasbeeh-no-auto-count.dhikr-storage');
});

test('salat: marking a prayer on an earlier day writes that day, not today', async ({
  page,
  context,
}) => {
  await open(page, { as: 'brother', at: ASR_NOW }, '/salat');
  await context.setOffline(true);
  await press(page, /Select W 14/);
  await expectBaseline(page, 'salat.yesterday');
  await press(page, 'Done', 2);
  await expectBaseline(page, 'salat.yesterday-asr-done');
  expectText(await outbox(page), 'salat.yesterday-asr-done.outbox');
});

test('salat: a missed prayer offers an optional reason, and tapping it again clears it', async ({
  page,
  context,
}) => {
  await open(page, { as: 'brother', at: ASR_NOW }, '/salat');
  await context.setOffline(true);
  await press(page, 'Miss', 2);
  await expectBaseline(page, 'salat.missed-reasons');
  await press(page, 'Overslept');
  await expectBaseline(page, 'salat.missed-reason-chosen');
  expectText(await outbox(page), 'salat.missed-reason.outbox');
  await press(page, 'Overslept');
  await expectBaseline(page, 'salat.missed-reason-cleared');
});

test('salat: the details toggle opens and closes, and shows what was marked', async ({
  page,
  context,
}) => {
  await open(page, { as: 'brother', at: ASR_NOW }, '/salat');
  await context.setOffline(true);
  await press(page, 'Done', 2);
  await press(page, 'Tasbeeh');
  await press(page, 'Less', 0);
  await expectBaseline(page, 'salat.details-closed-with-badges');
  await press(page, 'Details', 2);
  await expectBaseline(page, 'salat.details-reopened');
});

test('salat: on a journey, "prayed as" switches a prayer to full', async ({ page, context }) => {
  await enterDemo(page, { as: 'brother', at: '2026-10-15T19:00:00+06:00', storage: JOURNEY });
  await go(page, '/salat');
  await context.setOffline(true);
  await press(page, 'Done', 4);
  await press(page, /behind a local imam/);
  await expectBaseline(page, 'salat.journey-prayed-full');
  expectText(await outbox(page), 'salat.journey-prayed-full.outbox');
  await press(page, /2 · qaṣr/);
  await expectBaseline(page, 'salat.journey-prayed-qasr');
});

test('salat: on a journey, two finished prayers can be flagged as joined, and un-flagged', async ({
  page,
  context,
}) => {
  await enterDemo(page, { as: 'brother', at: '2026-10-15T19:00:00+06:00', storage: JOURNEY });
  await go(page, '/salat');
  await context.setOffline(true);
  await press(page, 'Done', 4);
  await press(page, /Joined with Maghrib/);
  await expectBaseline(page, 'salat.journey-joined-flag');
  expectText(await outbox(page), 'salat.journey-joined-flag.outbox');
  await press(page, /Joined with Maghrib/);
  await expectBaseline(page, 'salat.journey-joined-unflagged');
});

test('salat: the day cannot go back past the day tracking began', async ({ page }) => {
  await open(
    page,
    { as: 'brother', at: ASR_NOW, storage: { bustandeen_salat_start_date: '2026-10-14' } },
    '/salat'
  );
  await press(page, 'Previous day');
  await expect(button(page, 'Previous day')).toBeVisible();
  await button(page, 'Previous day').click({ force: true });
  await page.waitForTimeout(300);
  await expectBaseline(page, 'salat.at-the-start-date');
});

test('salat: the next-day arrow moves forward and the date opens the calendar', async ({
  page,
}) => {
  await open(page, { as: 'brother', at: ASR_NOW }, '/salat');
  await press(page, 'Previous day');
  await press(page, 'Next day');
  await expectBaseline(page, 'salat.at-1540'); // today again, as it first opened
});

// Audit P4-1 (PR 16, SalatTracker part 3): the page's state and tap handlers move into
// hooks, so every handler not yet driven above is recorded here first, on the old page.
const naflButton = (page: Page) => page.getByRole('button', { name: /^(Done|Mark Done)$/ }).last();

/** The zikr counts on the device: the shown counts and the taps not yet sent. */
const zikrCounts = (page: Page) =>
  page.evaluate(() => {
    const store = JSON.parse(localStorage.getItem('bustandeen_zikr_store') ?? '{}') as {
      state?: { counts?: unknown; total?: unknown };
    };
    const unsent = Object.keys(localStorage)
      .filter((k) => k.startsWith('bustandeen_zikr_unsent:'))
      .map((k) => (JSON.parse(localStorage.getItem(k)!) as { pending?: unknown }).pending);
    return JSON.stringify(
      { counts: store.state?.counts, total: store.state?.total, unsent },
      null,
      1
    );
  });

test('salat: nafl off and on, a type chosen, its rakah changed, then removed', async ({
  page,
  context,
}) => {
  await open(page, { as: 'brother', at: ASR_NOW }, '/salat');
  await context.setOffline(true);
  await declineBanner(page);
  await naflButton(page).click(); // the demo's nafl is done: this turns it off
  await page.waitForTimeout(400);
  await expectBaseline(page, 'salat.nafl-off');
  expectText(await outbox(page), 'salat.nafl-off.outbox');
  await naflButton(page).click(); // Mark Done: opens the type tiles
  await page.waitForTimeout(400);
  await expectBaseline(page, 'salat.nafl-on');
  expectText(await outbox(page), 'salat.nafl-on.outbox');
  await press(page, /^Duha \(Chasht\)/);
  await expectBaseline(page, 'salat.nafl-duha');
  expectText(await outbox(page), 'salat.nafl-duha.outbox');
  await press(page, 'More rakʿah');
  expectText(await outbox(page), 'salat.nafl-duha-more.outbox');
  await press(page, 'More rakʿah');
  await press(page, 'Fewer rakʿah');
  await expectBaseline(page, 'salat.nafl-duha-rakat');
  expectText(await outbox(page), 'salat.nafl-duha-more.outbox'); // +2 -2: back to 4
  await press(page, /^Tahajjud/);
  expectText(await outbox(page), 'salat.nafl-two-types.outbox');
  await press(page, /^Duha \(Chasht\)/);
  await expectBaseline(page, 'salat.nafl-duha-removed');
  expectText(await outbox(page), 'salat.nafl.outbox');
  await press(page, /^about$/);
  await expectBaseline(page, 'salat.nafl-about');
});

test('salat: un-marking a prayer with tasbeeh and Ayatul Kursi takes the dhikr back', async ({
  page,
  context,
}) => {
  await open(page, { as: 'brother', at: ASR_NOW }, '/salat');
  await context.setOffline(true);
  await press(page, 'Done', 2);
  await press(page, 'Tasbeeh');
  await press(page, 'Ayatul Kursi');
  expectText(await zikrCounts(page), 'salat.unmark-with-dhikr.counts-before');
  await press(page, 'Done', 2); // the same status again clears it
  await expectBaseline(page, 'salat.unmark-with-dhikr');
  expectText(await outbox(page), 'salat.unmark-with-dhikr.outbox');
  expectText(await dhikrStorage(page), 'salat.unmark-with-dhikr.dhikr-storage');
  expectText(await zikrCounts(page), 'salat.unmark-with-dhikr.counts-after');
});

test('salat: un-marking one prayer of a joined pair un-joins the other first', async ({
  page,
  context,
}) => {
  await enterDemo(page, { as: 'brother', at: '2026-10-15T19:00:00+06:00', storage: JOURNEY });
  await go(page, '/salat');
  await context.setOffline(true);
  await press(page, 'Done', 4);
  await press(page, /Joined with Maghrib/);
  await press(page, 'Done', 4); // Isha back to not logged
  await expectBaseline(page, 'salat.unmark-joined');
  expectText(await outbox(page), 'salat.unmark-joined.outbox');
});

test('salat: the kaza debt card opens, an unchanged count sends nothing, a day chip jumps', async ({
  page,
}) => {
  await open(page, { as: 'brother', at: ASR_NOW }, '/salat');
  await press(page, /Kaza Debt/);
  await expectBaseline(page, 'salat.debt-open');
  const fajr = page.locator('#kaza-debt-fajr');
  await fajr.fill('01');
  await fajr.press('Enter'); // still 1: no request, the draft is dropped
  await page.waitForTimeout(400);
  await expectBaseline(page, 'salat.debt-open'); // as it was
  const chip = page.getByText('Quick-mark kaza').locator('xpath=..').getByRole('button').first();
  await chip.click();
  await page.waitForTimeout(500);
  await expectBaseline(page, 'salat.debt-chip-jump');
});

// A changed count is sent and the card shows what the demo saved (it used to break the
// page into its error card: the demo answered with no counts). Escape keeps the saved
// count: the blur after it used to save the typed number.
test('salat: a changed kaza debt count is saved, clamped to 9999', async ({ page }) => {
  await open(page, { as: 'brother', at: ASR_NOW }, '/salat');
  await press(page, /Kaza Debt/);
  const asr = page.locator('#kaza-debt-asr');
  await asr.fill('12000'); // clamped to 9999
  await asr.press('Enter');
  await page.waitForTimeout(600);
  await expect(asr).toHaveValue('9999');
  await expectBaseline(page, 'salat.debt-changed');
});

test('salat: Escape on a typed kaza debt count keeps the saved count', async ({ page }) => {
  await open(page, { as: 'brother', at: ASR_NOW }, '/salat');
  await press(page, /Kaza Debt/);
  const fajr = page.locator('#kaza-debt-fajr');
  await fajr.fill('7');
  await fajr.press('Escape');
  await page.waitForTimeout(600);
  await expect(fajr).toHaveValue('1');
  await expectBaseline(page, 'salat.debt-open');
});

test('salat: the debt card points to the reset in the settings drawer', async ({ page }) => {
  await open(page, { as: 'brother', at: ASR_NOW }, '/salat');
  await press(page, /Kaza Debt/);
  await press(page, 'Reset it in Salat settings');
  await expectBaseline(page, 'salat.debt-reset-pointer');
});

test('salat: the month calendar opens, changes month and picks a day', async ({ page }) => {
  await open(page, { as: 'brother', at: ASR_NOW }, '/salat');
  await press(page, 'Open month calendar');
  await expectBaseline(page, 'salat.calendar-open');
  await press(page, 'Previous month');
  await expectBaseline(page, 'salat.calendar-previous-month');
  await press(page, 'Next month');
  await press(page, '12');
  await expectBaseline(page, 'salat.calendar-picked-12');
});

test('salat: the legend opens, and the cog opens the settings drawer', async ({ page }) => {
  await open(page, { as: 'brother', at: ASR_NOW }, '/salat');
  await press(page, /How it works/);
  await expectBaseline(page, 'salat.legend-open');
  await press(page, 'Salat settings');
  await expectBaseline(page, 'salat.settings-open');
});

// Signed out (not the demo): /salat is open to a guest, and every save opens the sign-in
// sheet instead of writing.
async function openAsGuest(page: Page, at: string) {
  await page.clock.setFixedTime(new Date(at));
  await page.context().addInitScript(() => {
    localStorage.setItem(
      'bustandeen_location',
      JSON.stringify({ latitude: 23.8103, longitude: 90.4125, name: 'Dhaka' })
    );
    localStorage.setItem('bustandeen_reduce_motion', 'on');
    localStorage.setItem('bustandeen_lang', 'en');
  });
  await page.goto('/salat');
  await page.waitForFunction(() => document.querySelector('main, nav') !== null);
  await page.waitForTimeout(800);
}

async function guestTapOpensSheet(page: Page, tap: () => Promise<void>) {
  await declineBanner(page);
  await tap();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

test('salat as a guest: Done, Kaza, Miss and nafl open the sign-in sheet, nothing is saved', async ({
  page,
}) => {
  await openAsGuest(page, ASR_NOW);
  await expectBaseline(page, 'salat.guest');
  for (const [name, nth] of [
    ['Done', 0],
    ['Kaza', 1],
    ['Miss', 2],
  ] as const)
    await guestTapOpensSheet(page, () => button(page, name, nth).click());
  await guestTapOpensSheet(page, () => naflButton(page).click());
  await naflButton(page).click();
  await page.waitForTimeout(400);
  await expectBaseline(page, 'salat.guest-sheet');
  expectText(await outbox(page), 'salat.guest.outbox');
});

test('salat as a guest: Tarawih in Ramadan opens the sign-in sheet', async ({ page }) => {
  await openAsGuest(page, '2027-02-20T20:00:00+06:00');
  await guestTapOpensSheet(page, () => button(page, /Tarawih tonight/).click());
  expectText(await outbox(page), 'salat.guest-tarawih.outbox');
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
