import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../src/models/User.js';
import ZikrDaily from '../src/models/ZikrDaily.js';
import ZikrEvent from '../src/models/ZikrEvent.js';
import ZikrGoal from '../src/models/ZikrGoal.js';

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};

let mongo;
const U = { uid: 'fix-a', email: 'fix-a@test.dev' };
const O = { uid: 'fix-other', email: 'fix-other@test.dev' };
const as = (r) => r.set('Authorization', `Bearer ${fakeJwt(U)}`);
const TODAY = '2026-10-10';
// A +6 (Dhaka) bucket anchor: the UTC date part is the local day.
const bucket = (d) => new Date(`${d}T18:00:00.000Z`);
const fix = (date, counts, today = TODAY) =>
  as(request(app).put('/api/zikr/day')).send({ date, today, counts });

describe('Correct a past zikr day (U7)', () => {
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_fixday_test' });
    await User.create({
      ...U,
      totalCount: 3600,
      zikrTotals: { SubhanAllah: 3500, Alhamdulillah: 100 },
    });
    await User.create({ ...O, totalCount: 50, zikrTotals: { SubhanAllah: 50 } });
    await ZikrGoal.create({ userId: U.uid, dailyTarget: 300, isActive: true });
    await ZikrDaily.create([
      // An over-logged day: 3,300 typed instead of 330.
      { userId: U.uid, date: bucket('2026-10-08'), zikrType: 'SubhanAllah', count: 3300 },
      { userId: U.uid, date: bucket('2026-10-08'), zikrType: 'Alhamdulillah', count: 100 },
      { userId: U.uid, date: bucket('2026-10-09'), zikrType: 'SubhanAllah', count: 100 },
      { userId: U.uid, date: bucket('2026-10-10'), zikrType: 'SubhanAllah', count: 100 },
      { userId: O.uid, date: bucket('2026-10-08'), zikrType: 'SubhanAllah', count: 50 },
    ]);
    await ZikrEvent.create({
      userId: U.uid,
      zikrType: 'SubhanAllah',
      amount: 300,
      ts: new Date('2026-10-08T05:00:00Z'),
    });
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase().catch(() => {});
    await mongoose.disconnect().catch(() => {});
    if (mongo) await mongo.stop();
  });

  test('reads a day', async () => {
    const res = await as(request(app).get('/api/zikr/day?date=2026-10-08'));
    expect(res.status).toBe(200);
    expect(res.body.counts).toEqual({ SubhanAllah: 3300, Alhamdulillah: 100 });
  });

  test('lowers an over-logged day; totals move by exactly the difference', async () => {
    const res = await fix('2026-10-08', { SubhanAllah: 330 });
    expect(res.status).toBe(200);
    expect(res.body.counts).toEqual({ SubhanAllah: 330, Alhamdulillah: 100 });
    const u = await User.findOne({ uid: U.uid }).lean();
    expect(u.totalCount).toBe(3600 - 2970);
    expect(u.zikrTotals.SubhanAllah).toBe(3500 - 2970);
    expect(u.zikrTotals.Alhamdulillah).toBe(100);
  });

  test('other days, other users and counter sessions are untouched', async () => {
    expect((await ZikrDaily.findOne({ userId: U.uid, date: bucket('2026-10-09') })).count).toBe(
      100
    );
    expect((await ZikrDaily.findOne({ userId: U.uid, date: bucket('2026-10-10') })).count).toBe(
      100
    );
    expect((await ZikrDaily.findOne({ userId: O.uid })).count).toBe(50);
    expect((await User.findOne({ uid: O.uid }).lean()).totalCount).toBe(50);
    expect(await ZikrEvent.countDocuments({ userId: U.uid })).toBe(1);
  });

  test('saving the same correction again changes nothing', async () => {
    await fix('2026-10-08', { SubhanAllah: 330 });
    expect((await User.findOne({ uid: U.uid }).lean()).totalCount).toBe(630);
  });

  test('can raise a day and add a zikr that day did not have', async () => {
    const res = await fix('2026-10-09', { SubhanAllah: 300, Takbir: 34 });
    expect(res.body.counts).toEqual({ SubhanAllah: 300, Takbir: 34 });
    const u = await User.findOne({ uid: U.uid }).lean();
    expect(u.totalCount).toBe(630 + 200 + 34);
    expect(u.zikrTotals.Takbir).toBe(34);
  });

  test('the streak follows the corrected days', async () => {
    // 10-08: 430 (met), 10-09: 334 (met), 10-10: 100 (today, in progress)
    const st = await as(
      request(app).get(`/api/analytics/streak?timezoneOffset=360&today=${TODAY}`)
    );
    expect(st.body.streak.currentStreak).toBe(2);
    await fix('2026-10-09', { SubhanAllah: 0, Takbir: 0 });
    await fix('2026-10-08', { SubhanAllah: 0, Alhamdulillah: 0 });
    const st2 = await as(
      request(app).get(`/api/analytics/streak?timezoneOffset=360&today=${TODAY}`)
    );
    expect(st2.body.streak.currentStreak).toBe(0);
  });

  test('totals never go below zero', async () => {
    await User.updateOne({ uid: U.uid }, { $set: { totalCount: 5, 'zikrTotals.SubhanAllah': 5 } });
    await fix('2026-10-07', { SubhanAllah: 0 });
    await ZikrDaily.create({
      userId: U.uid,
      date: bucket('2026-10-06'),
      zikrType: 'SubhanAllah',
      count: 40,
    });
    await fix('2026-10-06', { SubhanAllah: 0 });
    const u = await User.findOne({ uid: U.uid }).lean();
    expect(u.totalCount).toBe(0);
    expect(u.zikrTotals.SubhanAllah).toBe(0);
  });

  test('only past days within 30 days, never today or the future', async () => {
    expect((await fix(TODAY, { SubhanAllah: 1 })).status).toBe(400);
    expect((await fix('2026-10-11', { SubhanAllah: 1 })).status).toBe(400);
    expect((await fix('2026-09-09', { SubhanAllah: 1 })).status).toBe(400);
    expect((await fix('2026-09-10', { SubhanAllah: 1 })).status).toBe(200);
  });

  test('rejects bad input', async () => {
    expect((await fix('2026-10-08', {})).status).toBe(400);
    expect((await fix('2026-10-08', { SubhanAllah: -1 })).status).toBe(400);
    expect((await fix('2026-10-08', { SubhanAllah: 1.5 })).status).toBe(400);
    expect((await fix('2026-10-08', { 'a.b': 1 })).status).toBe(400);
    expect((await fix('2026-10-08', { $x: 1 })).status).toBe(400);
    expect((await request(app).put('/api/zikr/day').send({})).status).toBe(401);
  });
});
