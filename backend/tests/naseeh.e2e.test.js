import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import User from '../src/models/User.js';

// Route-level checks for /api/naseeh: auth, validation, the "Naseeh is off"
// guard, and that the no-model paths work with no Groq key configured.

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};

const TODAY = new Date().toISOString().slice(0, 10);
let mongo;

describe('Naseeh data API', () => {
  beforeAll(async () => {
    process.env.DEV_AUTH_BYPASS = '1';
    delete process.env.GROQ_API_KEY;
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test_naseeh_e2e' });
  });
  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase().catch(() => {});
      await mongoose.disconnect().catch(() => {});
    }
    if (mongo) await mongo.stop();
  });

  const onTok = fakeJwt({ uid: 'nas-on', email: 'on@test.dev', name: 'On' });
  const offTok = fakeJwt({ uid: 'nas-off', email: 'off@test.dev', name: 'Off' });
  const as = (r, tok) => r.set('Authorization', `Bearer ${tok}`);

  beforeAll(async () => {
    await User.create({ uid: 'nas-on', email: 'on@test.dev', aiEnabled: true });
    await User.create({ uid: 'nas-off', email: 'off@test.dev', aiEnabled: false });
  });

  test('every route requires auth', async () => {
    expect((await request(app).get('/api/naseeh/pattern-insights')).status).toBe(401);
    expect((await request(app).get('/api/naseeh/kaza-plan')).status).toBe(401);
    expect((await request(app).post('/api/naseeh/ask').send({ question: 'hi there' })).status).toBe(
      401
    );
    expect(
      (await request(app).post('/api/naseeh/data-answer').send({ query: 'kaza_owed' })).status
    ).toBe(401);
  });

  test('Naseeh switched off returns 403 on all four routes', async () => {
    const qs = `?today=${TODAY}&timezoneOffset=0&phrase=0`;
    expect((await as(request(app).get(`/api/naseeh/pattern-insights${qs}`), offTok)).status).toBe(
      403
    );
    expect(
      (await as(request(app).get(`/api/naseeh/kaza-plan?today=${TODAY}`), offTok)).status
    ).toBe(403);
    expect(
      (await as(request(app).post('/api/naseeh/ask'), offTok).send({ question: 'how many fajr' }))
        .status
    ).toBe(403);
    expect(
      (await as(request(app).post('/api/naseeh/data-answer'), offTok).send({ query: 'kaza_owed' }))
        .status
    ).toBe(403);
  });

  test('pattern insights: empty account gives an empty list, not an error', async () => {
    const res = await as(
      request(app).get(`/api/naseeh/pattern-insights?today=${TODAY}&timezoneOffset=360&phrase=0`),
      onTok
    );
    expect(res.status).toBe(200);
    expect(res.body.findings).toEqual([]);
    expect(res.body.ai).toBe(false);
  });

  test('kaza plan: nothing owed says so plainly', async () => {
    const res = await as(request(app).get(`/api/naseeh/kaza-plan?today=${TODAY}&phrase=0`), onTok);
    expect(res.status).toBe(200);
    expect(res.body.totalOwed).toBe(0);
    expect(res.body.lines).toHaveLength(1);
  });

  test('quick question answers from the database with no AI key', async () => {
    const res = await as(request(app).post('/api/naseeh/data-answer'), onTok).send({
      query: 'kaza_owed',
      today: TODAY,
      timezoneOffset: 0,
    });
    expect(res.status).toBe(200);
    expect(res.body.answered).toBe(true);
    expect(res.body.answer).toBe('You have no make-up prayers owed.');
  });

  test('validation rejects unknown lookups, bad prayers and bad dates', async () => {
    const bad = (body) => as(request(app).post('/api/naseeh/data-answer'), onTok).send(body);
    expect((await bad({ query: 'drop_users' })).status).toBe(400);
    expect((await bad({ query: 'salat_missed', prayer: 'witr' })).status).toBe(400);
    expect((await bad({ query: 'salat_missed', today: 'yesterday' })).status).toBe(400);
    expect((await bad({ query: 'salat_missed', period: 'decade' })).status).toBe(400);
    const tooLong = await as(request(app).post('/api/naseeh/ask'), onTok).send({
      question: 'x'.repeat(201),
    });
    expect(tooLong.status).toBe(400);
  });

  test('a free-text question with no AI key available degrades to a friendly message', async () => {
    const res = await as(request(app).post('/api/naseeh/ask'), onTok).send({
      question: 'how many fajr did I miss?',
      today: TODAY,
      timezoneOffset: 0,
    });
    expect(res.status).toBe(200);
    expect(res.body.answered).toBe(false);
    expect(res.body.reason).toBe('unavailable');
  });
});
