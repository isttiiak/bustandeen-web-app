import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { setClientDayBoundForTests } from '../src/validation/clientDay.js';

// This suite replays fixed calendar dates as "today"; the live-clock bound on
// the client day (audit 2026-11-16 P0-3) has its own tests in auditP0.e2e.test.js.
setClientDayBoundForTests(false);
import { MongoMemoryServer } from 'mongodb-memory-server';

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};

let mongo;

describe('Fasting API', () => {
  beforeAll(async () => {
    process.env.DEV_AUTH_BYPASS = '1';
    mongo = await MongoMemoryServer.create();
    const uri = mongo.getUri();
    await mongoose.connect(uri, { dbName: 'ihsan_test' });
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase().catch(() => {});
      await mongoose.disconnect().catch(() => {});
    }
    if (mongo) await mongo.stop();
  });

  const token = fakeJwt({ uid: 'f1', email: 'f1@test.dev', name: 'F1' });
  const auth = (r) => r.set('Authorization', `Bearer ${token}`);

  test('endpoints require auth', async () => {
    const res = await request(app).get(`/api/fasting/summary`);
    expect(res.status).toBe(401);
  });

  test('upsert + read a voluntary fast log', async () => {
    const put = await auth(request(app).put(`/api/fasting/log`)).send({
      date: '2026-06-29',
      category: 'voluntary',
      voluntaryKind: 'mon_thu',
      status: 'completed',
      hijri: '14 Muḥarram 1448',
    });
    expect(put.status).toBe(200);
    expect(put.body.log.category).toBe('voluntary');

    const get = await auth(request(app).get(`/api/fasting?date=2026-06-29`));
    expect(get.status).toBe(200);
    expect(get.body.log.voluntaryKind).toBe('mon_thu');
    expect(get.body.log.status).toBe('completed');
  });

  test('one fast per day: upsert replaces, not duplicates', async () => {
    await auth(request(app).put(`/api/fasting/log`)).send({
      date: '2026-06-29',
      category: 'qada',
      status: 'completed',
    });
    const get = await auth(request(app).get(`/api/fasting?date=2026-06-29`));
    expect(get.body.log.category).toBe('qada');
    expect(get.body.log.voluntaryKind).toBeUndefined();
  });

  test('ramadan category logs with a tarawih flag (dedicated tracker)', async () => {
    const res = await auth(request(app).put(`/api/fasting/log`)).send({
      date: '2026-06-30',
      category: 'ramadan',
      status: 'completed',
      tarawih: true,
    });
    expect(res.status).toBe(200);
    expect(res.body.log.category).toBe('ramadan');
    expect(res.body.log.tarawih).toBe(true);

    // Toggle tarawih off without touching the fast status
    const upd = await auth(request(app).put(`/api/fasting/log`)).send({
      date: '2026-06-30',
      category: 'ramadan',
      status: 'completed',
      tarawih: false,
    });
    expect(upd.body.log.tarawih).toBe(false);

    // Clean up so later stats tests aren't affected
    await auth(request(app).delete(`/api/fasting/log?date=2026-06-30`));
  });

  test('nadhr requires a valid vow; vow progress is derived in summary', async () => {
    const noVow = await auth(request(app).put(`/api/fasting/log`)).send({
      date: '2026-06-25',
      category: 'nadhr',
      vowId: '64b000000000000000000000',
      status: 'completed',
    });
    expect(noVow.status).toBe(400);

    const vowRes = await auth(request(app).post(`/api/fasting/vows`)).send({
      title: '3 days for shifa',
      targetDays: 3,
    });
    expect(vowRes.status).toBe(200);
    const vowId = vowRes.body.profile.vows[0]._id;

    const logged = await auth(request(app).put(`/api/fasting/log`)).send({
      date: '2026-06-25',
      category: 'nadhr',
      vowId,
      status: 'completed',
    });
    expect(logged.status).toBe(200);

    const summary = await auth(request(app).get(`/api/fasting/summary?today=2026-06-30`));
    expect(summary.status).toBe(200);
    expect(summary.body.profile.vows[0].completed).toBe(1);
  });

  test('qada progress and kaffarah consecutive run are derived from logs', async () => {
    await auth(request(app).patch(`/api/fasting/profile`)).send({
      qadaOwed: 5,
      kaffarah: { active: true, targetDays: 60 },
    });

    // qada already logged on 2026-06-29 (test above). Add kaffarah chain 26,27,28.
    for (const d of ['2026-06-26', '2026-06-27', '2026-06-28']) {
      await auth(request(app).put(`/api/fasting/log`)).send({
        date: d,
        category: 'kaffarah',
        status: 'completed',
      });
    }
    // Wait — 2026-06-28 then 29 is qada, chain ends at 28.
    const summary = await auth(request(app).get(`/api/fasting/summary?today=2026-06-29`));
    expect(summary.body.qadaCompleted).toBe(1);
    expect(summary.body.profile.qadaOwed).toBe(5);
    expect(summary.body.kaffarah.completed).toBe(3);
    // last kaffarah = 06-28, today = 06-29 → not stale, run = 3
    expect(summary.body.kaffarah.runStale).toBe(false);
    expect(summary.body.kaffarah.currentRun).toBe(3);

    // With today far in the future the chain is stale → run resets to 0
    const stale = await auth(request(app).get(`/api/fasting/summary?today=2026-07-15`));
    expect(stale.body.kaffarah.runStale).toBe(true);
    expect(stale.body.kaffarah.currentRun).toBe(0);
  });

  test("kaffarah run: a hayd interruption doesn't restart the count, but an ordinary gap does", async () => {
    // Fresh run: Aug 1-3 fasted, then a 3-day hayd episode (Aug 4-6), then
    // resume Aug 7. The majority position is that a mandatory Sharīʿah break
    // doesn't reset consecutiveness — she resumes where she left off.
    for (const d of ['2026-08-01', '2026-08-02', '2026-08-03']) {
      await auth(request(app).put(`/api/fasting/log`)).send({
        date: d,
        category: 'kaffarah',
        status: 'completed',
      });
    }
    await auth(request(app).post(`/api/cycle/logs`)).send({
      startDate: '2026-08-04',
      endDate: '2026-08-06',
      type: 'hayd',
      today: '2026-08-07',
    });
    await auth(request(app).put(`/api/fasting/log`)).send({
      date: '2026-08-07',
      category: 'kaffarah',
      status: 'completed',
    });

    const summary = await auth(request(app).get(`/api/fasting/summary?today=2026-08-07`));
    expect(summary.body.kaffarah.runStale).toBe(false);
    expect(summary.body.kaffarah.currentRun).toBe(4); // Aug 1-3 + Aug 7 (4-6 excused, not counted or broken)

    // Now break the SAME run with an ordinary (non-excused) gap: nothing
    // logged on Aug 8, then fasted again Aug 9 — this must NOT bridge the
    // gap the way the hayd episode did.
    await auth(request(app).put(`/api/fasting/log`)).send({
      date: '2026-08-09',
      category: 'kaffarah',
      status: 'completed',
    });
    const afterGap = await auth(request(app).get(`/api/fasting/summary?today=2026-08-09`));
    expect(afterGap.body.kaffarah.currentRun).toBe(1); // only Aug 9 — Aug 1-7 run is discarded
  });

  test("clear log deletes the day's row", async () => {
    const del = await auth(request(app).delete(`/api/fasting/log?date=2026-06-25`));
    expect(del.status).toBe(200);
    expect(del.body.deleted).toBe(true);

    const get = await auth(request(app).get(`/api/fasting?date=2026-06-25`));
    expect(get.body.log).toBeNull();
  });

  test('Mon/Thu streak: best-ever streak is tracked separately from the current one', async () => {
    const token2 = fakeJwt({ uid: 'f-monthu', email: 'f-monthu@test.dev', name: 'F2' });
    const auth2 = (r) => r.set('Authorization', `Bearer ${token2}`);
    const logMonThu = (date) =>
      auth2(request(app).put(`/api/fasting/log`)).send({
        date,
        category: 'voluntary',
        voluntaryKind: 'mon_thu',
        status: 'completed',
      });

    // A 10-fast run (Jan 5 – Feb 5, every Mon/Thu) — this becomes the best-ever streak.
    for (const date of [
      '2026-01-05',
      '2026-01-08',
      '2026-01-12',
      '2026-01-15',
      '2026-01-19',
      '2026-01-22',
      '2026-01-26',
      '2026-01-29',
      '2026-02-02',
      '2026-02-05',
    ]) {
      const res = await logMonThu(date);
      expect(res.status).toBe(200);
    }
    // Gap: Feb 9 (Mon) and Feb 12 (Thu) deliberately NOT logged — breaks the chain.
    // Then a fresh, smaller run: Feb 16 (Mon) + Feb 19 (Thu).
    await logMonThu('2026-02-16');
    await logMonThu('2026-02-19');

    const summary = await auth2(request(app).get(`/api/fasting/summary?today=2026-02-20`));
    expect(summary.status).toBe(200);
    expect(summary.body.stats.monThuStreak).toBe(2); // current run: just Feb 16 + Feb 19
    expect(summary.body.stats.bestMonThuStreak).toBe(10); // the earlier unbroken run
  });
});
