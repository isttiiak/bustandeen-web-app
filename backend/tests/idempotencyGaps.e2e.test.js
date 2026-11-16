import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import ClientOp from '../src/models/ClientOp.js';
import SalatDebt from '../src/models/SalatDebt.js';
import { idempotent } from '../src/middleware/idempotency.js';

// Audit 2026-11-16 P1-10: only `res.json` was recorded, an op id could be
// reused on another route, and the kaza adjust, the hifz writes and the zikr
// day correction ignored X-Client-Op-Id.

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};
const token = fakeJwt({ uid: 'idg-1', email: 'idg1@test.dev', name: 'Idg' });
const as = (r) => r.set('Authorization', `Bearer ${token}`);
const TODAY = new Date().toISOString().slice(0, 10);
const YESTERDAY = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

let mongo;
beforeAll(async () => {
  process.env.DEV_AUTH_BYPASS = '1';
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_idem_gaps' });
  await ClientOp.syncIndexes();
  await request(app).post('/api/auth/verify').send({ idToken: token });
});
afterAll(async () => {
  await mongoose.connection.dropDatabase().catch(() => {});
  await mongoose.disconnect().catch(() => {});
  if (mongo) await mongo.stop();
});

describe('responses that are not res.json are recorded too', () => {
  function miniApp(handler) {
    const a = express();
    a.use((req, _res, next) => {
      req.user = { uid: 'mini' };
      next();
    });
    a.post('/thing', idempotent(), handler);
    a.post('/other', idempotent(), (_req, res) => res.json({ ok: true }));
    return a;
  }

  test.each([
    ['sendStatus(204)', (_req, res) => res.sendStatus(204), 204],
    ['status(201).send(text)', (_req, res) => res.status(201).send('made'), 201],
    ['status(200).end()', (_req, res) => res.status(200).end(), 200],
  ])(
    '%s: a repeat with the same id is a replay, not "in progress", and runs the handler once',
    async (_n, h, code) => {
      let calls = 0;
      const a = miniApp((req, res) => {
        calls++;
        h(req, res);
      });
      const id = randomUUID();
      const first = await request(a).post('/thing').set('X-Client-Op-Id', id);
      expect(first.status).toBe(code);
      const second = await request(a).post('/thing').set('X-Client-Op-Id', id);
      expect(second.status).toBe(code);
      expect(second.headers['idempotent-replayed']).toBe('true');
      expect(calls).toBe(1);
    }
  );

  test("an op id used on a different route is refused, not answered with the first route's reply", async () => {
    const a = miniApp((_req, res) => res.json({ ok: true, from: 'thing' }));
    const id = randomUUID();
    const first = await request(a).post('/thing').set('X-Client-Op-Id', id);
    expect(first.status).toBe(200);
    const other = await request(a).post('/other').set('X-Client-Op-Id', id);
    expect(other.status).toBe(422);
    expect(other.body.error).toBe('op_id_reused');
  });
});

describe('writes that lacked idempotent() now dedupe', () => {
  test('kaza adjust: the same op id applies the change once', async () => {
    const id = randomUUID();
    const send = () =>
      as(request(app).patch('/api/salat/debt/adjust'))
        .set('X-Client-Op-Id', id)
        .send({ prayer: 'fajr', delta: 3 });
    const a = await send();
    const b = await send();
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(b.headers['idempotent-replayed']).toBe('true');
    expect((await SalatDebt.findOne({ userId: 'idg-1' })).owed.fajr).toBe(3);
  });

  test('zikr day correction: the same op id is replayed', async () => {
    const id = randomUUID();
    const send = () =>
      as(request(app).put('/api/zikr/day'))
        .set('X-Client-Op-Id', id)
        .send({ date: YESTERDAY, today: TODAY, counts: { SubhanAllah: 25 } });
    const a = await send();
    const b = await send();
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(b.headers['idempotent-replayed']).toBe('true');
  });

  test('hifz next: the same op id adds one entry', async () => {
    const id = randomUUID();
    const send = () =>
      as(request(app).post('/api/hifz/next')).set('X-Client-Op-Id', id).send({ date: TODAY });
    const a = await send();
    const b = await send();
    expect(b.headers['idempotent-replayed']).toBe('true');
    expect(b.status).toBe(a.status);
    expect(await ClientOp.countDocuments({ uid: 'idg-1', opId: id })).toBe(1);
  });
});
