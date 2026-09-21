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

describe('Cross-device preferences', () => {
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

  const tokenA = fakeJwt({ uid: 'pa', email: 'pa@test.dev', name: 'PA' });
  const tokenB = fakeJwt({ uid: 'pb', email: 'pb@test.dev', name: 'PB' });
  const tokenC = fakeJwt({ uid: 'pc', email: 'pc@test.dev', name: 'PC' });
  const as = (token, r) => r.set('Authorization', `Bearer ${token}`);
  const put = (token, prefs) => as(token, request(app).put('/api/user/prefs')).send({ prefs });

  // Real users always exist by the time the client syncs (sign-in verifies first).
  beforeAll(async () => {
    for (const t of [tokenA, tokenB, tokenC]) {
      await as(t, request(app).post('/api/auth/verify')).send({});
    }
  });

  test('requires auth', async () => {
    expect((await request(app).get('/api/user/prefs')).status).toBe(401);
  });

  test('a setting saved on one device is returned to another', async () => {
    let res = await put(tokenA, { bustandeen_reduce_motion: { v: '1', t: 1000 } });
    expect(res.status).toBe(200);
    res = await as(tokenA, request(app).get('/api/user/prefs'));
    expect(res.body.prefs.bustandeen_reduce_motion).toEqual({ v: '1', t: 1000 });
  });

  test('newest write wins per key; older writes are ignored', async () => {
    await put(tokenA, { bustandeen_zikr_volume: { v: '0.2', t: 2000 } });
    let res = await put(tokenA, { bustandeen_zikr_volume: { v: '0.9', t: 1500 } });
    expect(res.body.prefs.bustandeen_zikr_volume.v).toBe('0.2');
    res = await put(tokenA, { bustandeen_zikr_volume: { v: '0.5', t: 3000 } });
    expect(res.body.prefs.bustandeen_zikr_volume.v).toBe('0.5');
  });

  test('unknown keys are dropped', async () => {
    const res = await put(tokenA, {
      bustandeen_idToken: { v: 'secret', t: 5000 },
      bustandeen_location: { v: '{}', t: 5000 },
    });
    expect(res.status).toBe(200);
    expect(res.body.prefs.bustandeen_idToken).toBeUndefined();
    expect(res.body.prefs.bustandeen_location).toBeUndefined();
  });

  test('a far-future timestamp is clamped so it cannot lock the key', async () => {
    const res = await put(tokenA, { bustandeen_calc_method: { v: 'MWL', t: 9e15 } });
    expect(res.body.prefs.bustandeen_calc_method.t).toBeLessThan(Date.now() + 10 * 60_000);
  });

  test('prefs are per-user and are not leaked through /me', async () => {
    let res = await as(tokenB, request(app).get('/api/user/prefs'));
    expect(res.body.prefs.bustandeen_reduce_motion).toBeUndefined();
    await as(tokenA, request(app).get('/api/user/me'));
    res = await as(tokenA, request(app).get('/api/user/me'));
    expect(JSON.stringify(res.body)).not.toContain('bustandeen_reduce_motion');
  });

  test('legacy Quran profile prefs are surfaced for a new device', async () => {
    await as(tokenC, request(app).patch('/api/quran/profile')).send({ reciterId: 'alafasy' });
    const res = await as(tokenC, request(app).get('/api/user/prefs'));
    expect(res.body.prefs.bustandeen_reciter.v).toBe('alafasy');
  });

  test('rejects malformed bodies', async () => {
    const res = await as(tokenA, request(app).put('/api/user/prefs')).send({ prefs: { a: 1 } });
    expect(res.status).toBe(400);
  });
});
