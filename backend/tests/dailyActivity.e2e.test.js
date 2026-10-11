import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import AdminAccount from '../src/models/AdminAccount.js';
import User from '../src/models/User.js';
import DailyActivity from '../src/models/DailyActivity.js';
import SalatLog from '../src/models/SalatLog.js';
import QuranLog from '../src/models/QuranLog.js';
import FastingLog from '../src/models/FastingLog.js';
import ZikrDaily from '../src/models/ZikrDaily.js';
import {
  activityDay,
  markActive,
  computeFeatureCounts,
  getDailySeries,
} from '../src/services/dailyActivity.service.js';
import { bucketDateForDayString } from '../src/utils/timezone-flexible.js';

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};

let mongo;

describe('Daily activity for the admin retention view (T4.6)', () => {
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test_daily_activity' });
    await AdminAccount.create({
      firebaseUid: 'da-servant',
      email: 'servant@test.dev',
      role: 'servant',
      createdBy: 'test-seed',
    });
    await AdminAccount.create({
      firebaseUid: 'da-ansar',
      email: 'ansar@test.dev',
      role: 'ansar',
      ansarDomain: 'general',
      createdBy: 'test-seed',
    });
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase().catch(() => {});
      await mongoose.disconnect().catch(() => {});
    }
    if (mongo) await mongo.stop();
  });

  test('days are Bangladesh days (UTC+6)', () => {
    expect(activityDay(new Date('2026-10-11T17:59:00Z'))).toBe('2026-10-11');
    expect(activityDay(new Date('2026-10-11T18:00:00Z'))).toBe('2026-10-12');
  });

  test('each person counts once per day, again on the next day', async () => {
    await User.create({ uid: 'p1', email: 'p1@test.dev' });
    await User.create({ uid: 'p2', email: 'p2@test.dev' });
    const d1 = new Date('2026-10-01T06:00:00Z');
    const d2 = new Date('2026-10-02T06:00:00Z');
    await markActive('p1', d1);
    await markActive('p1', d1); // second open the same day
    await markActive('p2', d1);
    await markActive('p1', d2);
    expect((await DailyActivity.findById('2026-10-01').lean()).active).toBe(2);
    expect((await DailyActivity.findById('2026-10-02').lean()).active).toBe(1);
    // A person who does not exist changes nothing
    await markActive('ghost', d2);
    expect((await DailyActivity.findById('2026-10-02').lean()).active).toBe(1);
  });

  test('opening the app (POST /api/auth/verify) counts, once a day, for new users too', async () => {
    const today = activityDay();
    const before = (await DailyActivity.findById(today).lean())?.active ?? 0;
    const token = fakeJwt({ uid: 'newbie', email: 'newbie@test.dev', email_verified: true });
    for (let i = 0; i < 2; i++) {
      const res = await request(app)
        .post('/api/auth/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(200);
      expect(res.body.user).not.toHaveProperty('activeDay');
    }
    expect((await DailyActivity.findById(today).lean()).active).toBe(before + 1);
  });

  test('feature counts: who logged what, never auto-filled entries', async () => {
    const day = '2026-09-20';
    const missedOnly = {
      fajr: { status: 'missed' },
      dhuhr: { status: 'missed' },
      asr: { status: 'missed' },
      maghrib: { status: 'missed' },
      isha: { status: 'missed' },
    };
    await SalatLog.create([
      { userId: 'a', date: day, prayers: { ...missedOnly, fajr: { status: 'completed' } } },
      { userId: 'b', date: day, prayers: { ...missedOnly, isha: { status: 'kaza' } } },
      { userId: 'c', date: day, prayers: missedOnly }, // the sweep only: not use
      { userId: 'd', date: day, prayers: missedOnly, nafl: { completed: true } },
    ]);
    await QuranLog.create([
      { userId: 'a', date: day, pages: 2 },
      { userId: 'b', date: day, pages: 0, ayat: 0, durationSec: 0 },
    ]);
    await FastingLog.create([
      { userId: 'a', date: day, category: 'voluntary', status: 'completed' },
    ]);
    // Zikr rows anchored at each person's local day start: Dhaka, UTC, New York
    await ZikrDaily.create([
      { userId: 'a', date: bucketDateForDayString(day, 360), zikrType: 'SubhanAllah', count: 33 },
      { userId: 'a', date: bucketDateForDayString(day, 360), zikrType: 'Alhamdulillah', count: 33 },
      { userId: 'e', date: bucketDateForDayString(day, 0), zikrType: 'SubhanAllah', count: 10 },
      { userId: 'f', date: bucketDateForDayString(day, -240), zikrType: 'SubhanAllah', count: 5 },
      { userId: 'g', date: bucketDateForDayString(day, 360), zikrType: 'SubhanAllah', count: 0 },
      // the day before, must not leak in
      {
        userId: 'h',
        date: bucketDateForDayString('2026-09-19', 360),
        zikrType: 'SubhanAllah',
        count: 3,
      },
    ]);
    const counts = await computeFeatureCounts([day, '2026-09-19']);
    expect(counts.get(day)).toEqual({ salat: 3, zikr: 3, quran: 1, fasting: 1 });
    expect(counts.get('2026-09-19')).toEqual({ salat: 0, zikr: 1, quran: 0, fasting: 0 });
  });

  test('the series saves finished days once, leaves logs untouched, computes today live', async () => {
    const now = new Date('2026-09-21T06:00:00Z'); // Bangladesh 2026-09-21
    const logsBefore = await Promise.all([
      SalatLog.countDocuments(),
      QuranLog.countDocuments(),
      FastingLog.countDocuments(),
      ZikrDaily.countDocuments(),
    ]);
    const series = await getDailySeries(3, now);
    expect(series.days.map((d) => d.day)).toEqual(['2026-09-19', '2026-09-20', '2026-09-21']);
    expect(series.days[1]).toMatchObject({ salat: 3, zikr: 3, quran: 1, fasting: 1 });
    const saved = await DailyActivity.findById('2026-09-20').lean();
    expect(saved).toMatchObject({ salat: 3, zikr: 3 });
    expect(saved.featuresAt).toBeTruthy();
    expect(await DailyActivity.findById('2026-09-21').lean()).toBeNull(); // today not saved

    // A saved day is read, not recomputed: a late log does not change it
    await QuranLog.create({ userId: 'z', date: '2026-09-20', pages: 1 });
    const again = await getDailySeries(3, now);
    expect(again.days[1].quran).toBe(1);

    expect(
      await Promise.all([
        SalatLog.countDocuments(),
        QuranLog.countDocuments(),
        FastingLog.countDocuments(),
        ZikrDaily.countDocuments(),
      ])
    ).toEqual([logsBefore[0], logsBefore[1] + 1, logsBefore[2], logsBefore[3]]);
  });

  test('opened-the-app counts start at the first counted day (null before)', async () => {
    const series = await getDailySeries(3, new Date('2026-10-02T06:00:00Z'));
    expect(series.activeSince).toBe('2026-10-01');
    expect(series.days.map((d) => d.active)).toEqual([null, 2, 1]);
  });

  test('only the Servant can read it', async () => {
    const anon = await request(app).get('/api/admin/stats/daily');
    expect(anon.status).toBe(401);
    const ansar = await request(app)
      .get('/api/admin/stats/daily')
      .set('X-Admin-Token', fakeJwt({ uid: 'da-ansar' }));
    expect(ansar.status).toBe(403);
    const res = await request(app)
      .get('/api/admin/stats/daily')
      .set('X-Admin-Token', fakeJwt({ uid: 'da-servant' }));
    expect(res.status).toBe(200);
    expect(res.body.days).toHaveLength(90);
    expect(res.body.days[89].day).toBe(activityDay());
    expect(Object.keys(res.body.days[0]).sort()).toEqual(
      ['active', 'day', 'fasting', 'quran', 'salat', 'zikr'].sort()
    );
  });
});
