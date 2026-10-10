import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../src/models/User.js';
import ZikrDaily from '../src/models/ZikrDaily.js';
import ZikrGoal from '../src/models/ZikrGoal.js';
import ZikrStreak from '../src/models/ZikrStreak.js';
import SalatLog from '../src/models/SalatLog.js';
import FastingLog from '../src/models/FastingLog.js';
import FastingProfile from '../src/models/FastingProfile.js';
import QuranLog from '../src/models/QuranLog.js';
import QuranProfile from '../src/models/QuranProfile.js';

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};

let mongo;
const U = { uid: 'fresh-a', email: 'fresh-a@test.dev' };
const token = fakeJwt(U);
const as = (r) => r.set('Authorization', `Bearer ${token}`);
const TODAY = '2026-10-10';
const RESET = '2026-10-08';
const zDay = (d) => new Date(`${d}T00:00:00.000Z`);

/** Every stored worship document for the user, to prove a reset changes none. */
async function worshipSnapshot() {
  const strip = (docs) => docs.map(({ _id, __v, updatedAt, ...rest }) => rest);
  return JSON.stringify({
    zikr: strip(await ZikrDaily.find({ userId: U.uid }).sort({ date: 1, zikrType: 1 }).lean()),
    goal: strip(await ZikrGoal.find({ userId: U.uid }).lean()),
    salat: strip(await SalatLog.find({ userId: U.uid }).sort({ date: 1 }).lean()),
    fasting: strip(await FastingLog.find({ userId: U.uid }).sort({ date: 1 }).lean()),
    fastingProfile: strip(await FastingProfile.find({ userId: U.uid }).lean()),
    quran: strip(await QuranLog.find({ userId: U.uid }).sort({ date: 1 }).lean()),
    quranCounts: (await QuranProfile.findOne({ userId: U.uid }).lean())?.surahCounts,
    khatm: (await QuranProfile.findOne({ userId: U.uid }).lean())?.khatmCount,
    totals: await User.findOne({ uid: U.uid }).select('totalCount zikrTotals -_id').lean(),
  });
}

const reset = (areas, note) =>
  as(request(app).post('/api/stats/reset')).send({ areas, today: RESET, note });
const undo = (area) => as(request(app).post('/api/stats/reset/undo')).send({ area });

describe('Stats fresh start (U7)', () => {
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_fresh_test' });
    await User.create({ ...U, totalCount: 1000, zikrTotals: { SubhanAllah: 1000 } });
    await ZikrGoal.create({ userId: U.uid, dailyTarget: 100, isActive: true });
    await ZikrStreak.create({ userId: U.uid, longestStreak: 9 });
    // Goal met every day 2026-10-01 .. 10-10 (10 days); 2026-10-09 is a big day.
    for (let i = 1; i <= 10; i++) {
      const d = `2026-10-${String(i).padStart(2, '0')}`;
      await ZikrDaily.create({
        userId: U.uid,
        date: zDay(d),
        zikrType: 'SubhanAllah',
        count: i === 9 ? 500 : 100,
      });
    }
    await SalatLog.create({
      userId: U.uid,
      date: '2026-10-05',
      prayers: { fajr: { status: 'completed' } },
    });
    const fp = await FastingProfile.create({
      userId: U.uid,
      qadaOwed: 2,
      vows: [{ title: 'Shukr', targetDays: 3 }],
    });
    await FastingLog.create([
      {
        userId: U.uid,
        date: '2026-10-01',
        category: 'voluntary',
        voluntaryKind: 'mon_thu',
        status: 'completed',
      },
      { userId: U.uid, date: '2026-10-02', category: 'qada', status: 'completed' },
      {
        userId: U.uid,
        date: '2026-10-03',
        category: 'nadhr',
        vowId: String(fp.vows[0]._id),
        status: 'completed',
      },
      {
        userId: U.uid,
        date: '2026-10-08',
        category: 'voluntary',
        voluntaryKind: 'mon_thu',
        status: 'completed',
      },
    ]);
    await QuranProfile.create({ userId: U.uid, khatmCount: 2, surahCounts: { 36: 3, 67: 1 } });
    await QuranLog.create([
      { userId: U.uid, date: '2026-10-05', ayat: 50 },
      { userId: U.uid, date: '2026-10-06', ayat: 50 },
      { userId: U.uid, date: '2026-10-09', ayat: 20 },
      { userId: U.uid, date: '2026-10-10', ayat: 10 },
    ]);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase().catch(() => {});
    await mongoose.disconnect().catch(() => {});
    if (mongo) await mongo.stop();
  });

  test('requires sign-in and valid areas', async () => {
    expect((await request(app).get('/api/stats/resets')).status).toBe(401);
    const bad = await as(request(app).post('/api/stats/reset')).send({
      areas: ['noor'],
      today: RESET,
    });
    expect(bad.status).toBe(400);
    const bad2 = await as(request(app).post('/api/stats/reset')).send({
      areas: ['zikr'],
      today: 'yesterday',
    });
    expect(bad2.status).toBe(400);
  });

  test('before any reset, numbers are lifetime', async () => {
    const s = await as(request(app).get(`/api/zikr/summary?timezoneOffset=0&today=${TODAY}`));
    expect(s.body.totalCount).toBe(1000);
    expect(s.body.since).toBeNull();
    const st = await as(request(app).get(`/api/analytics/streak?timezoneOffset=0&today=${TODAY}`));
    expect(st.body.streak.currentStreak).toBe(10);
  });

  test('zikr: totals, streak and best count from the reset day; nothing stored changes', async () => {
    const before = await worshipSnapshot();
    const res = await reset(['zikr'], 'After Ramadan');
    expect(res.status).toBe(200);
    expect(res.body.resets.zikr).toMatchObject({
      date: RESET,
      history: [{ date: RESET, note: 'After Ramadan' }],
    });

    const s = await as(request(app).get(`/api/zikr/summary?timezoneOffset=0&today=${TODAY}`));
    expect(s.body.totalCount).toBe(700); // 8th 100 + 9th 500 + 10th 100
    expect(s.body.lifetimeTotal).toBe(1000);
    expect(s.body.since).toBe(RESET);

    const st = await as(request(app).get(`/api/analytics/streak?timezoneOffset=0&today=${TODAY}`));
    expect(st.body.streak.currentStreak).toBe(3);
    expect(st.body.streak.longestStreak).toBe(3);

    const a = await as(request(app).get(`/api/analytics?days=7&timezoneOffset=0&today=${TODAY}`));
    expect(a.body.allTime.totalCount).toBe(700);
    expect(a.body.allTime.lifetime).toEqual({ totalCount: 1000, longestStreak: 10 });
    expect(a.body.allTime.bestDay.count).toBe(500);
    // History views still show the days before the reset.
    expect(a.body.chartData.find((d) => d.date === '2026-10-05').total).toBe(100);

    expect(await worshipSnapshot()).toBe(before);
  });

  test('resetting the same area twice on one day adds nothing', async () => {
    const res = await reset(['zikr']);
    expect(res.body.resets.zikr.history).toHaveLength(1);
  });

  test('undo brings the previous numbers back, including the best streak', async () => {
    const res = await undo('zikr');
    expect(res.body.resets.zikr.date).toBeNull();
    const s = await as(request(app).get(`/api/zikr/summary?timezoneOffset=0&today=${TODAY}`));
    expect(s.body.totalCount).toBe(1000);
    const st = await as(request(app).get(`/api/analytics/streak?timezoneOffset=0&today=${TODAY}`));
    expect(st.body.streak.currentStreak).toBe(10);
    expect(st.body.streak.longestStreak).toBe(10);
  });

  test('fasting: running stats restart; qada, kaffarah and vows never do', async () => {
    const before = await worshipSnapshot();
    await reset(['fasting']);
    const s = await as(request(app).get(`/api/fasting/summary?today=${TODAY}`));
    expect(s.body.stats).toMatchObject({ total: 1, voluntaryTotal: 1, since: RESET });
    expect(s.body.qadaCompleted).toBe(1);
    expect(s.body.profile.qadaOwed).toBe(2);
    expect(s.body.profile.vows[0].completed).toBe(1);
    expect(await worshipSnapshot()).toBe(before);
  });

  test('quran: streak, all-time and top surahs restart; khatm count stays', async () => {
    const before = await worshipSnapshot();
    await reset(['quran']);
    // A surah completed after the reset counts once.
    await QuranProfile.updateOne({ userId: U.uid }, { $set: { 'surahCounts.36': 4 } });
    const s = await as(request(app).get(`/api/quran/summary?today=${TODAY}`));
    expect(s.body.since).toBe(RESET);
    expect(s.body.stats.allTimeUnits).toBe(30);
    expect(s.body.streak).toBe(2);
    expect(s.body.bestStreak).toBe(2);
    expect(s.body.topSurahs).toEqual([{ surah: 36, completions: 1 }]);
    expect(s.body.profile.khatmCount).toBe(2);
    await QuranProfile.updateOne({ userId: U.uid }, { $set: { 'surahCounts.36': 3 } });
    expect(await worshipSnapshot()).toBe(before);
  });

  test('salat uses its existing reset fields, and undo restores the earlier date', async () => {
    await User.updateOne(
      { uid: U.uid },
      {
        $set: {
          salatResetDate: '2026-09-01',
          salatResetHistory: [{ date: '2026-09-01', note: '', resetAt: new Date() }],
        },
      }
    );
    await reset(['salat']);
    expect((await User.findOne({ uid: U.uid }).lean()).salatResetDate).toBe(RESET);
    await undo('salat');
    const u = await User.findOne({ uid: U.uid }).lean();
    expect(u.salatResetDate).toBe('2026-09-01');
    expect(u.salatResetHistory).toHaveLength(1);
  });

  test('reset all sets one date for every area', async () => {
    const res = await reset(['zikr', 'salat', 'fasting', 'quran']);
    for (const a of ['zikr', 'salat', 'fasting', 'quran'])
      expect(res.body.resets[a].date).toBe(RESET);
    const got = await as(request(app).get('/api/stats/resets'));
    expect(got.body.resets.quran.history).toHaveLength(1);
  });

  test('the old zikr "Reset counters" route no longer zeroes totals or deletes the goal', async () => {
    await undo('zikr');
    await as(request(app).post('/api/zikr/reset')).send({ today: RESET });
    const u = await User.findOne({ uid: U.uid }).lean();
    expect(u.totalCount).toBe(1000);
    expect(await ZikrGoal.countDocuments({ userId: U.uid })).toBe(1);
    expect(u.statsResets.zikr.at(-1).date).toBe(RESET);
  });
});
