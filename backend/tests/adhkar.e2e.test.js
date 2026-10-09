import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { MongoMemoryServer } from 'mongodb-memory-server';
import AdhkarDay from '../src/models/AdhkarDay.js';
import ZikrDaily from '../src/models/ZikrDaily.js';
import { deleteAccount } from '../src/services/user.service.js';

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};

let mongo;

describe('Adhkar routine API (T4.3)', () => {
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

  const tokenFor = (uid) => fakeJwt({ uid, email: `${uid}@test.dev`, name: uid });
  const as = (uid) => (r) => r.set('Authorization', `Bearer ${tokenFor(uid)}`);
  const auth = as('ad1');

  test('endpoints require auth', async () => {
    expect((await request(app).get('/api/adhkar/day?date=2026-10-10')).status).toBe(401);
    expect(
      (await request(app).put('/api/adhkar/day').send({ date: '2026-10-10', period: 'morning' }))
        .status
    ).toBe(401);
  });

  test('an untouched day reads as nothing done', async () => {
    const res = await auth(request(app).get('/api/adhkar/day?date=2026-10-01'));
    expect(res.status).toBe(200);
    expect(res.body.day).toEqual({ date: '2026-10-01', morning: false, evening: false });
  });

  test('marking morning done leaves evening alone, and repeating it keeps the first time', async () => {
    const put = await auth(request(app).put('/api/adhkar/day')).send({
      date: '2026-10-10',
      period: 'morning',
    });
    expect(put.status).toBe(200);
    expect(put.body.day).toEqual({ date: '2026-10-10', morning: true, evening: false });
    const first = (await AdhkarDay.findOne({ userId: 'ad1', date: '2026-10-10' }).lean()).morningAt;

    await new Promise((r) => setTimeout(r, 15));
    await auth(request(app).put('/api/adhkar/day')).send({ date: '2026-10-10', period: 'morning' });
    const docs = await AdhkarDay.find({ userId: 'ad1', date: '2026-10-10' }).lean();
    expect(docs).toHaveLength(1);
    expect(docs[0].morningAt.getTime()).toBe(first.getTime());

    await auth(request(app).put('/api/adhkar/day')).send({ date: '2026-10-10', period: 'evening' });
    const get = await auth(request(app).get('/api/adhkar/day?date=2026-10-10'));
    expect(get.body.day).toEqual({ date: '2026-10-10', morning: true, evening: true });
  });

  test('one person cannot see another person’s day', async () => {
    const other = await as('ad2')(request(app).get('/api/adhkar/day?date=2026-10-10'));
    expect(other.body.day).toEqual({ date: '2026-10-10', morning: false, evening: false });
  });

  test('rejects bad input', async () => {
    const badPeriod = await auth(request(app).put('/api/adhkar/day')).send({
      date: '2026-10-10',
      period: 'night',
    });
    expect(badPeriod.status).toBe(400);
    const badDate = await auth(request(app).get('/api/adhkar/day?date=10-10-2026'));
    expect(badDate.status).toBe(400);
  });

  test('worship data is untouched: no zikr rows are written', async () => {
    await as('ad3')(request(app).put('/api/adhkar/day')).send({
      date: '2026-10-10',
      period: 'evening',
    });
    expect(await ZikrDaily.countDocuments({ userId: 'ad3' })).toBe(0);
  });

  test('account deletion removes the rows', async () => {
    await as('ad4')(request(app).put('/api/adhkar/day')).send({
      date: '2026-10-10',
      period: 'morning',
    });
    expect(await AdhkarDay.countDocuments({ userId: 'ad4' })).toBe(1);
    await deleteAccount('ad4');
    expect(await AdhkarDay.countDocuments({ userId: 'ad4' })).toBe(0);
  });
});
