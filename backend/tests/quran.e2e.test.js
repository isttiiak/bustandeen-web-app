import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};

let mongo;

describe('Quran API', () => {
  beforeAll(async () => {
    process.env.DEV_AUTH_BYPASS = '1';
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test' });
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase().catch(() => {});
      await mongoose.disconnect().catch(() => {});
    }
    if (mongo) await mongo.stop();
  });

  const token = fakeJwt({ uid: 'q1', email: 'q1@test.dev', name: 'Q1' });
  const auth = (r) => r.set('Authorization', `Bearer ${token}`);

  test('summary requires auth', async () => {
    const res = await request(app).get(`/api/quran/summary`);
    expect(res.status).toBe(401);
  });

  test('reading accumulates within a day and advances the bookmark', async () => {
    let res = await auth(request(app).post(`/api/quran/read`)).send({
      date: '2026-06-30',
      pages: 2,
      advancePosition: true,
    });
    expect(res.status).toBe(200);
    expect(res.body.profile.currentPage).toBe(2);

    res = await auth(request(app).post(`/api/quran/read`)).send({
      date: '2026-06-30',
      pages: 3,
      advancePosition: true,
    });
    expect(res.body.log.pages).toBe(5);
    expect(res.body.profile.currentPage).toBe(5);
  });

  test("summary computes streak, today's pages, and goal", async () => {
    // Read on 07-01 and 07-02 to form a 3-day streak with 06-30
    await auth(request(app).post(`/api/quran/read`)).send({
      date: '2026-07-01',
      pages: 2,
      advancePosition: false,
    });
    await auth(request(app).post(`/api/quran/read`)).send({
      date: '2026-07-02',
      pages: 4,
      advancePosition: false,
    });

    const res = await auth(request(app).get(`/api/quran/summary?today=2026-07-02`));
    expect(res.status).toBe(200);
    expect(res.body.todayPages).toBe(4);
    // Goal is OPT-IN now: default 0 means never "met" until the user sets one
    expect(res.body.profile.dailyGoalAyat).toBe(0);
    expect(res.body.goalMet).toBe(false);
    expect(res.body.streak).toBe(3);
    expect(res.body.stats.allTimePages).toBe(11);
    expect(res.body.pace).toBeGreaterThan(0);
    expect(res.body.estDaysToKhatm).toBeGreaterThan(0);
  });

  test('khatm completes and wraps when the bookmark crosses 604', async () => {
    // Jump the bookmark near the end, then read past it
    await auth(request(app).patch(`/api/quran/profile`)).send({ currentPage: 600 });
    const res = await auth(request(app).post(`/api/quran/read`)).send({
      date: '2026-07-02',
      pages: 10,
      advancePosition: true,
    });
    expect(res.body.khatmCompleted).toBe(true);
    expect(res.body.profile.khatmCount).toBe(1);
    expect(res.body.profile.currentPage).toBe(6); // 610 - 604
  });

  test('profile goal updates and is reflected in summary', async () => {
    await auth(request(app).patch(`/api/quran/profile`)).send({
      dailyGoalPages: 20,
      dailyGoalAyat: 20,
    });
    const res = await auth(request(app).get(`/api/quran/summary?today=2026-07-02`));
    expect(res.body.profile.dailyGoalPages).toBe(20);
    // v4: the goal unit is AYAT (1 page ≈ 10 ayat). 14 pages = 140 units ≥ 20.
    expect(res.body.goalMet).toBe(true);
    const strict = await auth(request(app).patch(`/api/quran/profile`)).send({
      dailyGoalAyat: 200,
    });
    expect(strict.status).toBe(200);
    const res2 = await auth(request(app).get(`/api/quran/summary?today=2026-07-02`));
    expect(res2.body.goalMet).toBe(false); // 140 units < 200
  });

  test("display prefs: default to the frontend's existing localStorage defaults, sync via PATCH, and flip displayPrefsSet", async () => {
    const before = await auth(request(app).get(`/api/quran/summary?today=2026-07-02`));
    expect(before.body.profile.arabicFont).toBe('clean');
    expect(before.body.profile.fontArabicPx).toBe(30);
    expect(before.body.profile.translitEnabled).toBe(false);
    expect(before.body.profile.listenCountsAsAyat).toBe(true);
    expect(before.body.profile.reciterId).toBe('dossari');
    expect(before.body.profile.translations).toEqual(['en.sahih']);
    expect(before.body.profile.displayPrefsSet).toBe(false);

    const patch = await auth(request(app).patch(`/api/quran/profile`)).send({
      arabicFont: 'uthmani',
      fontArabicPx: 40,
      translitEnabled: true,
      translations: ['en.sahih', 'bn.hoque'],
    });
    expect(patch.status).toBe(200);

    const after = await auth(request(app).get(`/api/quran/summary?today=2026-07-02`));
    expect(after.body.profile.arabicFont).toBe('uthmani');
    expect(after.body.profile.fontArabicPx).toBe(40);
    expect(after.body.profile.translitEnabled).toBe(true);
    expect(after.body.profile.translations).toEqual(['en.sahih', 'bn.hoque']);
    // Untouched fields stay at their default, unaffected by the partial update.
    expect(after.body.profile.listenCountsAsAyat).toBe(true);
    expect(after.body.profile.displayPrefsSet).toBe(true);
  });

  test('display prefs: rejects an out-of-range font size', async () => {
    const res = await auth(request(app).patch(`/api/quran/profile`)).send({
      fontArabicPx: 999,
    });
    expect(res.status).toBe(400);
  });

  test('v4 ayah engine: read-ayat logs units, credits a surah COMPLETION, advances khatam', async () => {
    // Read 6 āyāt of al-Fātiḥah (no completion yet)
    const r = await auth(request(app).post(`/api/quran/read-ayat`)).send({
      date: '2026-07-03',
      count: 6,
      surah: 1,
      advanceKhatm: true,
    });
    expect(r.status).toBe(200);
    expect(r.body.todayAyat).toBe(6);
    expect(r.body.currentAyah).toBe(6);

    // Reach the last āyah and mark the surah completed
    const r2 = await auth(request(app).post(`/api/quran/read-ayat`)).send({
      date: '2026-07-03',
      count: 1,
      surah: 1,
      advanceKhatm: true,
      completedSurah: true,
    });
    expect(r2.status).toBe(200);
    expect(r2.body.currentAyah).toBe(7);

    const sum = await auth(request(app).get(`/api/quran/summary?today=2026-07-03`));
    expect(sum.body.todayAyat).toBe(7);
    // Top surahs now track COMPLETIONS, not raw āyāt
    expect(sum.body.topSurahs[0]).toEqual({ surah: 1, completions: 1 });
    expect(sum.body.profile.currentAyah).toBe(7);
    expect(sum.body.profile.totalAyat).toBe(6236);
  });

  test('v4: reading duas/bundles (count 0) never credits a completion', async () => {
    // A pure completion marker only fires when completedSurah is set
    const r = await auth(request(app).post(`/api/quran/read-ayat`)).send({
      date: '2026-07-04',
      count: 0,
      surah: 36,
    });
    expect(r.status).toBe(200);
    const sum = await auth(request(app).get(`/api/quran/summary?today=2026-07-04`));
    expect((sum.body.topSurahs ?? []).some((t) => t.surah === 36)).toBe(false);
  });

  test('v4: khatm wraps when currentAyah crosses 6236', async () => {
    await auth(request(app).patch(`/api/quran/profile`)).send({ currentAyah: 6230 });
    const r = await auth(request(app).post(`/api/quran/read-ayat`)).send({
      date: '2026-07-03',
      count: 10,
      surah: 114,
      advanceKhatm: true,
    });
    expect(r.body.khatmCompleted).toBe(true);
    expect(r.body.currentAyah).toBe(4); // 6230 + 10 - 6236
  });

  test('v4: bookmarks toggle on and off and appear in summary', async () => {
    const on = await auth(request(app).post(`/api/quran/bookmark`)).send({ surah: 2, ayah: 255 });
    expect(on.body.bookmarks).toEqual([{ surah: 2, ayah: 255 }]);
    const sum = await auth(request(app).get(`/api/quran/summary?today=2026-07-03`));
    expect(sum.body.bookmarks).toEqual([{ surah: 2, ayah: 255 }]);
    const off = await auth(request(app).post(`/api/quran/bookmark`)).send({ surah: 2, ayah: 255 });
    expect(off.body.bookmarks).toEqual([]);
  });

  test('v4: history returns daily units for analytics', async () => {
    const res = await auth(request(app).get(`/api/quran/history?days=7&today=2026-07-03`));
    expect(res.status).toBe(200);
    const day = res.body.history.find((h) => h.date === '2026-07-03');
    expect(day.ayat).toBe(17); // 7 + 10
    expect(day.units).toBe(17);
  });

  test('v4.8: resume position syncs server-side and clears with ayah 0', async () => {
    const set = await auth(request(app).put(`/api/quran/resume`)).send({ surah: 2, ayah: 12 });
    expect(set.status).toBe(200);
    let sum = await auth(request(app).get(`/api/quran/summary?today=2026-07-03`));
    expect(sum.body.profile.readerPos['2']).toBe(12);

    const clear = await auth(request(app).put(`/api/quran/resume`)).send({ surah: 2, ayah: 0 });
    expect(clear.status).toBe(200);
    sum = await auth(request(app).get(`/api/quran/summary?today=2026-07-03`));
    expect(sum.body.profile.readerPos['2']).toBeUndefined();
  });

  test('v4.8: dua bookmarks toggle and appear in summary', async () => {
    const on = await auth(request(app).post(`/api/quran/dua-bookmark`)).send({
      duaId: 'dua-yunus',
    });
    expect(on.body.savedDuas).toEqual(['dua-yunus']);
    const sum = await auth(request(app).get(`/api/quran/summary?today=2026-07-03`));
    expect(sum.body.profile.savedDuas).toEqual(['dua-yunus']);
    const off = await auth(request(app).post(`/api/quran/dua-bookmark`)).send({
      duaId: 'dua-yunus',
    });
    expect(off.body.savedDuas).toEqual([]);
  });

  test('v4.8: khatam is opt-in — start sets the flag, reset clears bookmark + flag', async () => {
    const start = await auth(request(app).post(`/api/quran/khatam/start`));
    expect(start.status).toBe(200);
    expect(start.body.khatamStartedAt).toBeTruthy();

    const reset = await auth(request(app).post(`/api/quran/khatam/reset`));
    expect(reset.status).toBe(200);
    const sum = await auth(request(app).get(`/api/quran/summary?today=2026-07-03`));
    expect(sum.body.profile.khatamStartedAt).toBeNull();
    expect(sum.body.profile.currentAyah).toBe(0);
    expect(sum.body.profile.currentPage).toBe(0);
  });

  test('reading sessions require auth', async () => {
    const res = await request(app).get(`/api/quran/sessions?date=2026-07-05`);
    expect(res.status).toBe(401);
  });

  test('session upsert is idempotent by clientSessionId and credits the daily total once per delta', async () => {
    const started = new Date('2026-07-05T10:00:00.000Z').toISOString();
    const mid = new Date('2026-07-05T10:03:00.000Z').toISOString();
    const end = new Date('2026-07-05T10:05:00.000Z').toISOString();

    const first = await auth(request(app).post(`/api/quran/session`)).send({
      clientSessionId: 'sess-aaaaaaaa',
      date: '2026-07-05',
      startedAt: started,
      endedAt: mid,
      activeDurationSec: 120,
      ayahCount: 3,
      pagesRead: 0,
      surahs: [1],
    });
    expect(first.status).toBe(200);
    expect(first.body.activeDurationSec).toBe(120);

    // Same session, more time accumulated — only the DELTA (180-120=60s)
    // should be added to the daily total, not the full 180s again.
    const second = await auth(request(app).post(`/api/quran/session`)).send({
      clientSessionId: 'sess-aaaaaaaa',
      date: '2026-07-05',
      startedAt: started,
      endedAt: end,
      activeDurationSec: 180,
      ayahCount: 5,
      pagesRead: 0,
      surahs: [1, 2],
    });
    expect(second.status).toBe(200);
    expect(second.body.activeDurationSec).toBe(180);

    const history = await auth(request(app).get(`/api/quran/history?days=3&today=2026-07-05`));
    // durationSec isn't in the history payload, so check via the sessions list.
    const list = await auth(request(app).get(`/api/quran/sessions?date=2026-07-05`));
    expect(list.status).toBe(200);
    expect(list.body.sessions).toHaveLength(1);
    expect(list.body.sessions[0].activeDurationSec).toBe(180);
    expect(list.body.sessions[0].ayahCount).toBe(5);
    expect(list.body.sessions[0].surahs).toEqual([1, 2]);
    expect(history.status).toBe(200);
  });

  test('session activeDurationSec is clamped to elapsed wall-clock time', async () => {
    const started = new Date('2026-07-06T08:00:00.000Z').toISOString();
    const end = new Date('2026-07-06T08:00:10.000Z').toISOString(); // only 10s elapsed

    const res = await auth(request(app).post(`/api/quran/session`)).send({
      clientSessionId: 'sess-bbbbbbbb',
      date: '2026-07-06',
      startedAt: started,
      endedAt: end,
      activeDurationSec: 999, // implausible — more active time than wall-clock time
      ayahCount: 1,
      pagesRead: 0,
      surahs: [1],
    });
    expect(res.status).toBe(200);
    expect(res.body.activeDurationSec).toBe(10);
  });

  test('sessions under the noise floor are hidden from the day list', async () => {
    const started = new Date('2026-07-07T08:00:00.000Z').toISOString();
    const end = new Date('2026-07-07T08:00:03.000Z').toISOString();

    await auth(request(app).post(`/api/quran/session`)).send({
      clientSessionId: 'sess-cccccccc',
      date: '2026-07-07',
      startedAt: started,
      endedAt: end,
      activeDurationSec: 3,
      ayahCount: 0,
      pagesRead: 0,
      surahs: [],
    });

    const list = await auth(request(app).get(`/api/quran/sessions?date=2026-07-07`));
    expect(list.body.sessions).toHaveLength(0);
  });

  test('sessions rejects a malformed clientSessionId', async () => {
    const res = await auth(request(app).post(`/api/quran/session`)).send({
      clientSessionId: 'a b/c', // spaces + slash not allowed
      date: '2026-07-05',
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      activeDurationSec: 5,
    });
    expect(res.status).toBe(400);
  });

  test('sessions default to source "read" when omitted, and "listen" is tagged and returned', async () => {
    const readRes = await auth(request(app).post(`/api/quran/session`)).send({
      clientSessionId: 'sess-read0001',
      date: '2026-07-09',
      startedAt: new Date('2026-07-09T09:00:00.000Z').toISOString(),
      endedAt: new Date('2026-07-09T09:05:00.000Z').toISOString(),
      activeDurationSec: 60,
      ayahCount: 2,
      pagesRead: 0,
      surahs: [1],
    });
    expect(readRes.status).toBe(200);

    const listenRes = await auth(request(app).post(`/api/quran/session`)).send({
      clientSessionId: 'sess-listen001',
      date: '2026-07-09',
      startedAt: new Date('2026-07-09T10:00:00.000Z').toISOString(),
      endedAt: new Date('2026-07-09T10:05:00.000Z').toISOString(),
      activeDurationSec: 90,
      ayahCount: 4,
      pagesRead: 0,
      surahs: [36],
      source: 'listen',
    });
    expect(listenRes.status).toBe(200);

    const list = await auth(request(app).get(`/api/quran/sessions?date=2026-07-09`));
    expect(list.body.sessions).toHaveLength(2);
    const bySource = Object.fromEntries(list.body.sessions.map((s) => [s.source, s]));
    expect(bySource.read.surahs).toEqual([1]);
    expect(bySource.listen.surahs).toEqual([36]);
  });

  test('sessions rejects an invalid source value', async () => {
    const res = await auth(request(app).post(`/api/quran/session`)).send({
      clientSessionId: 'sess-badsource1',
      date: '2026-07-09',
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      activeDurationSec: 5,
      source: 'background-music',
    });
    expect(res.status).toBe(400);
  });

  test('time-of-day requires auth', async () => {
    const res = await request(app).get(`/api/quran/time-of-day`);
    expect(res.status).toBe(401);
  });

  test('time-of-day buckets active minutes by local hour-of-day, combining read+listen', async () => {
    // Uses real Date.now() (like zikr's own getTimeOfDayDistribution), so
    // fixtures are hours-ago-from-now rather than fixed 2026 dates — keeps
    // this independent of whatever real clock the suite runs under.
    const tzOffsetMin = 360; // UTC+6
    const now = Date.now();
    const started1 = new Date(now - 4 * 60 * 60 * 1000);
    const started2 = new Date(now - 3 * 60 * 60 * 1000);
    const localHourOf = (d) => new Date(d.getTime() + tzOffsetMin * 60 * 1000).getUTCHours();
    const hour1 = localHourOf(started1);
    const hour2 = localHourOf(started2); // always differs from hour1 by exactly 1

    await auth(request(app).post(`/api/quran/session`)).send({
      clientSessionId: 'sess-tod-read01',
      date: '2026-07-09',
      startedAt: started1.toISOString(),
      endedAt: new Date(started1.getTime() + 60_000).toISOString(),
      activeDurationSec: 60,
      ayahCount: 1,
      pagesRead: 0,
      surahs: [1],
    });
    await auth(request(app).post(`/api/quran/session`)).send({
      clientSessionId: 'sess-tod-listen01',
      date: '2026-07-09',
      startedAt: started2.toISOString(),
      endedAt: new Date(started2.getTime() + 90_000).toISOString(),
      activeDurationSec: 90,
      ayahCount: 4,
      pagesRead: 0,
      surahs: [36],
      source: 'listen',
    });

    const res = await auth(
      request(app).get(`/api/quran/time-of-day?days=1&timezoneOffset=${tzOffsetMin}`)
    );
    expect(res.status).toBe(200);
    expect(res.body.hours).toHaveLength(24);
    const bucket1 = res.body.hours.find((h) => h.hour === hour1);
    const bucket2 = res.body.hours.find((h) => h.hour === hour2);
    expect(bucket1.total).toBe(1); // 60s -> 1 minute
    expect(bucket2.total).toBe(2); // 90s -> rounds to 2 minutes
  });

  test('DELETE /api/quran/all wipes reading sessions along with everything else', async () => {
    const del = await auth(request(app).delete(`/api/quran/all`));
    expect(del.status).toBe(200);
    const list = await auth(request(app).get(`/api/quran/sessions?date=2026-07-05`));
    expect(list.body.sessions).toHaveLength(0);
  });
});
