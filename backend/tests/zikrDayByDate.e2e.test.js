import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../src/models/User.js';
import ZikrDaily from '../src/models/ZikrDaily.js';

// Option B (2026-10-12/13): a zikr day is matched by its DATE, not by the
// exact bucket instant. ZikrDaily.date is the UTC instant of local midnight
// for the offset that was sent (12 Oct at +360 = 18:00Z, at +60 = 23:00Z):
// its UTC date part is the day for every offset. Buckets saved under another
// offset (a tab left open across a DST change, a phone that changed zone)
// were missed by "today", by subtraction and at the edges of the charts.
//
// Part 1 pins today's behaviour for a user who always sends the same offset:
// stored documents and responses must be exactly what they were before.
// Part 2 is the mixed-offset case that was wrong.

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};
const auth = (uid) => (r) =>
  r.set('Authorization', `Bearer ${fakeJwt({ uid, email: `${uid}@test.dev` })}`);

const DHAKA = 360;
const LONDON = 60;
// Relative to today (Dhaka): the server only takes manual counts for recent
// days, so fixed dates made this suite fail once they were a few days old.
const shift = (day, n) =>
  new Date(Date.parse(`${day}T00:00:00.000Z`) + n * 86_400_000).toISOString().slice(0, 10);
const D = new Date(Date.now() + DHAKA * 60_000).toISOString().slice(0, 10);
const D1 = shift(D, -1);
const D3 = shift(D, -3);
const D6 = shift(D, -6);
/** Bucket key of `day` for an offset (bucketDateForDayString). */
const key = (day, offset) => {
  const utcMin = (((1440 - offset) % 1440) + 1440) % 1440;
  return new Date(Date.parse(`${day}T00:00:00.000Z`) + utcMin * 60_000);
};
/** Noon of `day` on a clock with this offset (the client's midday anchor). */
const noon = (day, offset) => Date.parse(`${day}T12:00:00.000Z`) - offset * 60_000;

const batch = (uid, increments, offset, today = D) =>
  auth(uid)(request(app).post('/api/zikr/increment/batch')).send({
    increments,
    timezoneOffset: offset,
    today,
  });
const summary = (uid, offset, today = D) =>
  auth(uid)(request(app).get(`/api/zikr/summary?timezoneOffset=${offset}&today=${today}`));
const analytics = (uid, offset, today = D, days = 7) =>
  auth(uid)(
    request(app).get(`/api/analytics?days=${days}&timezoneOffset=${offset}&today=${today}`)
  );
const docs = async (uid) =>
  (await ZikrDaily.find({ userId: uid }).sort({ date: 1, zikrType: 1 }).lean()).map((d) => ({
    date: d.date.toISOString(),
    zikrType: d.zikrType,
    count: d.count,
  }));
const verify = (uid) =>
  request(app)
    .post('/api/auth/verify')
    .send({ idToken: fakeJwt({ uid, email: `${uid}@test.dev` }) });

let mongo;
beforeAll(async () => {
  process.env.DEV_AUTH_BYPASS = '1';
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_daybydate_test' });
});
afterAll(async () => {
  await mongoose.connection.dropDatabase().catch(() => {});
  await mongoose.disconnect().catch(() => {});
  if (mongo) await mongo.stop();
});

describe('same offset every time: unchanged', () => {
  const uid = 'same-zone';
  beforeAll(async () => {
    await verify(uid);
    // Yesterday, typed in afterwards
    await batch(
      uid,
      [{ zikrType: 'SubhanAllah', amount: 40, ts: noon(D1, DHAKA), manual: true }],
      DHAKA,
      D
    );
    // Today: taps, a second type, a subtraction, one below zero
    await batch(uid, [{ zikrType: 'SubhanAllah', amount: 33, ts: noon(D, DHAKA) }], DHAKA);
    await batch(uid, [{ zikrType: 'Alhamdulillah', amount: 10, ts: noon(D, DHAKA) }], DHAKA);
    await batch(uid, [{ zikrType: 'SubhanAllah', amount: -3, ts: noon(D, DHAKA) }], DHAKA);
    await batch(uid, [{ zikrType: 'Alhamdulillah', amount: -50, ts: noon(D, DHAKA) }], DHAKA);
  });

  it('stores exactly the same documents', async () => {
    expect(await docs(uid)).toEqual([
      { date: key(D1, DHAKA).toISOString(), zikrType: 'SubhanAllah', count: 40 },
      { date: key(D, DHAKA).toISOString(), zikrType: 'Alhamdulillah', count: 0 },
      { date: key(D, DHAKA).toISOString(), zikrType: 'SubhanAllah', count: 30 },
    ]);
    const user = await User.findOne({ uid }).lean();
    expect(user.totalCount).toBe(70);
    expect(user.zikrTotals).toEqual({ SubhanAllah: 70, Alhamdulillah: 0 });
  });

  it('summary and analytics answer exactly as before', async () => {
    const s = await summary(uid, DHAKA);
    expect(s.body.today).toEqual({ total: 30, perType: { SubhanAllah: 30, Alhamdulillah: 0 } });
    const a = await analytics(uid, DHAKA);
    expect(a.body.today.total).toBe(30);
    const byDate = Object.fromEntries(a.body.chartData.map((p) => [p.date, p.total]));
    expect(byDate[D1]).toBe(40);
    expect(byDate[D]).toBe(30);
    expect(a.body.allTime.bestDay).toEqual({
      date: key(D1, DHAKA).toISOString(),
      count: 40,
    });
  });
});

describe('a day saved under two offsets', () => {
  const uid = 'mixed-zone';
  beforeAll(async () => {
    await verify(uid);
    await User.updateOne({ uid }, { $set: { totalCount: 25, zikrTotals: { SubhanAllah: 25 } } });
    // Earlier today on London time, then on Dhaka time
    await ZikrDaily.create([
      { userId: uid, date: key(D, LONDON), zikrType: 'SubhanAllah', count: 10 },
      // The first day of a 7-day chart, saved on London time
      { userId: uid, date: key(D6, LONDON), zikrType: 'SubhanAllah', count: 15 },
    ]);
  });

  it("today's total includes the bucket saved on the other offset", async () => {
    const s = await summary(uid, DHAKA);
    expect(s.body.today.total).toBe(10);
  });

  it('an add goes into the existing bucket of that day (no second bucket)', async () => {
    await batch(uid, [{ zikrType: 'SubhanAllah', amount: 5, ts: noon(D, DHAKA) }], DHAKA);
    const today = (await docs(uid)).filter((d) => d.date.startsWith(D));
    expect(today).toEqual([
      { date: key(D, LONDON).toISOString(), zikrType: 'SubhanAllah', count: 15 },
    ]);
  });

  it('a subtraction takes from the existing bucket, never below zero', async () => {
    const r = await batch(
      uid,
      [{ zikrType: 'SubhanAllah', amount: -12, ts: noon(D, DHAKA) }],
      DHAKA
    );
    expect(r.status).toBe(200);
    const today = (await docs(uid)).filter((d) => d.date.startsWith(D));
    expect(today).toEqual([
      { date: key(D, LONDON).toISOString(), zikrType: 'SubhanAllah', count: 3 },
    ]);
    const user = await User.findOne({ uid }).lean();
    expect(user.zikrTotals.SubhanAllah).toBe(18); // 25 + 5 - 12
  });

  it('across two buckets of one day: largest first, clamped, totals move by what was taken', async () => {
    await ZikrDaily.create({ userId: uid, date: key(D, DHAKA), zikrType: 'SubhanAllah', count: 6 });
    // Day now 3 (London) + 6 (Dhaka) = 9; take 20
    await batch(uid, [{ zikrType: 'SubhanAllah', amount: -20, ts: noon(D, DHAKA) }], DHAKA);
    const today = (await docs(uid)).filter((d) => d.date.startsWith(D));
    expect(today.map((d) => d.count)).toEqual([0, 0]);
    const user = await User.findOne({ uid }).lean();
    expect(user.zikrTotals.SubhanAllah).toBe(9); // 18 - 9, not 18 - 20
    expect(user.totalCount).toBe(9);
  });

  it('charts include the edge days and best day sums a day across offsets', async () => {
    await ZikrDaily.create([
      { userId: uid, date: key(D3, LONDON), zikrType: 'SubhanAllah', count: 7 },
      { userId: uid, date: key(D3, DHAKA), zikrType: 'Alhamdulillah', count: 9 },
    ]);
    const a = await analytics(uid, DHAKA);
    const byDate = Object.fromEntries(a.body.chartData.map((p) => [p.date, p.total]));
    expect(byDate[D6]).toBe(15); // first day, other offset
    expect(byDate[D3]).toBe(16);
    expect(a.body.allTime.bestDay.count).toBe(16);
    expect(a.body.allTime.bestDay.date.slice(0, 10)).toBe(D3);
  });
});
