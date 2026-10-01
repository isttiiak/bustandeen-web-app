import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import ClientOp from '../src/models/ClientOp.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Audit T2.3: a write replayed from the offline outbox (or retried after a
// lost response) with the same X-Client-Op-Id is applied once.

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};

let mongo;
const token = fakeJwt({ uid: 'idem-1', email: 'idem1@test.dev', name: 'Idem' });
const other = fakeJwt({ uid: 'idem-2', email: 'idem2@test.dev', name: 'Other' });
const as = (r, t = token) => r.set('Authorization', `Bearer ${t}`);
const TODAY = new Date().toISOString().slice(0, 10);

describe('X-Client-Op-Id dedupe', () => {
  beforeAll(async () => {
    process.env.DEV_AUTH_BYPASS = '1';
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test' });
    await ClientOp.syncIndexes();
    await request(app).post(`/api/auth/verify`).send({ idToken: token });
    await request(app).post(`/api/auth/verify`).send({ idToken: other });
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase().catch(() => {});
      await mongoose.disconnect().catch(() => {});
    }
    if (mongo) await mongo.stop();
  });

  const total = async (t = token) => {
    const sum = await as(request(app).get(`/api/zikr/summary`), t);
    return sum.body.totalCount;
  };
  const batch = (opId, amount, t = token) => {
    const r = as(request(app).post(`/api/zikr/increment/batch`), t);
    if (opId) r.set('X-Client-Op-Id', opId);
    return r.send({ increments: [{ zikrType: 'SubhanAllah', amount }] });
  };

  test('a replayed zikr batch is counted once and gets the first answer back', async () => {
    const first = await batch('op-zikr-00000001', 33);
    expect(first.status).toBe(200);
    expect(first.headers['idempotent-replayed']).toBeUndefined();

    const again = await batch('op-zikr-00000001', 33);
    expect(again.status).toBe(200);
    expect(again.headers['idempotent-replayed']).toBe('true');
    expect(again.body).toEqual(first.body);

    expect(await total()).toBe(33);
  });

  test('a new op id is a new write', async () => {
    await batch('op-zikr-00000002', 10);
    expect(await total()).toBe(43);
  });

  test('requests without the header behave exactly as before', async () => {
    await batch(undefined, 1);
    await batch(undefined, 1);
    expect(await total()).toBe(45);
  });

  test('op ids are per user: the same id from someone else is their own write', async () => {
    await batch('op-zikr-00000001', 7, other);
    expect(await total(other)).toBe(7);
    expect(await total()).toBe(45);
  });

  test('a malformed op id is rejected, not silently ignored', async () => {
    const res = await batch('bad id!', 1);
    expect(res.status).toBe(400);
    expect(await total()).toBe(45);
  });

  test('a duplicate that arrives while the first is in flight gets 409, nothing applied', async () => {
    await ClientOp.create({
      uid: 'idem-1',
      opId: 'op-inflight-0001',
      route: 'POST /api/zikr/increment/batch',
      status: 'pending',
    });
    const res = await batch('op-inflight-0001', 5);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('op_in_progress');
    expect(await total()).toBe(45);
  });

  test('an abandoned in-flight claim (over a minute old) may run again', async () => {
    await ClientOp.create({
      uid: 'idem-1',
      opId: 'op-abandoned-001',
      route: 'POST /api/zikr/increment/batch',
      status: 'pending',
      createdAt: new Date(Date.now() - 5 * 60_000),
    });
    const res = await batch('op-abandoned-001', 5);
    expect(res.status).toBe(200);
    expect(await total()).toBe(50);
    const again = await batch('op-abandoned-001', 5);
    expect(again.headers['idempotent-replayed']).toBe('true');
    expect(await total()).toBe(50);
  });

  test('a validation error is not recorded (validate runs first), so a fixed retry works', async () => {
    const bad = await as(request(app).post(`/api/zikr/increment/batch`))
      .set('X-Client-Op-Id', 'op-invalid-00001')
      .send({ increments: 'nope' });
    expect(bad.status).toBe(400);
    expect(await ClientOp.findOne({ uid: 'idem-1', opId: 'op-invalid-00001' })).toBeNull();
  });

  test('quran read-ayat replays do not double the day or move the khatam twice', async () => {
    const send = () =>
      as(request(app).post(`/api/quran/read-ayat`))
        .set('X-Client-Op-Id', 'op-quran-0000001')
        .send({ date: TODAY, count: 5, surah: 1, advanceKhatm: true });
    const first = await send();
    expect(first.status).toBe(200);
    expect(first.body.todayAyat).toBe(5);
    const again = await send();
    expect(again.body.todayAyat).toBe(5);
    expect(again.body.currentAyah).toBe(first.body.currentAyah);

    const summary = await as(request(app).get(`/api/quran/summary?date=${TODAY}`));
    expect(summary.body.todayAyat).toBe(5);
  });

  test('cycle: a replayed start is applied once and its response body is never stored', async () => {
    const send = () =>
      as(request(app).post(`/api/cycle/start`))
        .set('X-Client-Op-Id', 'op-cycle-0000001')
        .send({ date: TODAY, type: 'hayd' });
    const first = await send();
    expect(first.status).toBe(200);
    // Without dedupe a second start is a 400 ("already active"); with it, a replay.
    const again = await send();
    expect(again.status).toBe(200);
    expect(again.headers['idempotent-replayed']).toBe('true');
    expect(again.body).toEqual({ ok: true });

    const row = await ClientOp.findOne({ uid: 'idem-1', opId: 'op-cycle-0000001' }).lean();
    expect(row.status).toBe('done');
    expect(row.body).toEqual({ ok: true });
  });

  test('the dedupe record keeps one row per op and a 30-day TTL', async () => {
    const rows = await ClientOp.countDocuments({ uid: 'idem-1', opId: 'op-zikr-00000001' });
    expect(rows).toBe(1);
    const indexes = await ClientOp.collection.indexes();
    expect(indexes.find((i) => i.key.uid === 1 && i.key.opId === 1)?.unique).toBe(true);
    expect(indexes.find((i) => i.key.createdAt === 1)?.expireAfterSeconds).toBe(2592000);
  });
});
