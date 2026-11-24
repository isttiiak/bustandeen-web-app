import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../src/models/User.js';
import RateLimitCounter from '../src/models/RateLimitCounter.js';
import { importBackupSchema } from '../src/validation/user.schemas.js';

// Audit 2026-11-16 P2-6: POST /api/user/import takes up to 20 MB, and that body was read and
// parsed before anyone had signed in or the import limit had been looked at. It is now read
// after sign-in, after the limit and after the revocation check.

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};

let app;
let mongo;
beforeAll(async () => {
  // Limiters switch themselves off outside production, decided at load: load as production,
  // then back to test so the dev sign-in bypass works.
  process.env.NODE_ENV = 'production';
  app = (await import('../src/app.js')).default;
  process.env.NODE_ENV = 'test';
  process.env.DEV_AUTH_BYPASS = '1';
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_parse_after_auth' });
  await RateLimitCounter.syncIndexes();
  await User.create({ uid: 'pa-1', email: 'pa1@test.dev' });
});
afterAll(async () => {
  await mongoose.connection.dropDatabase().catch(() => {});
  await mongoose.disconnect().catch(() => {});
  if (mongo) await mongo.stop();
});

const token = fakeJwt({ uid: 'pa-1', email: 'pa1@test.dev' });
const BROKEN = '{"app": "ihsan", "version": 3, "salat": [';
const post = (auth) => {
  const r = request(app).post('/api/user/import').set('Content-Type', 'application/json');
  return auth ? r.set('Authorization', `Bearer ${token}`) : r;
};

describe('the import body is read late', () => {
  test('nobody signed in gets 401, not a complaint about their body', async () => {
    expect((await post(false).send(BROKEN)).status).toBe(401);
  });

  test('a signed-in person with a damaged file still gets 400 from the parser', async () => {
    expect((await post(true).send(BROKEN)).status).toBe(400);
  });

  test('once the hourly import limit is used up, nothing is parsed: 429, not 400', async () => {
    // 10 per hour per person: the damaged file above and this loop use them up.
    let last;
    for (let i = 0; i < 12; i += 1) last = await post(true).send(BROKEN);
    expect(last.status).toBe(429);
  });
});

describe('importBackupSchema', () => {
  const run = (body) => importBackupSchema.safeParse({ body });
  test('accepts a backup file, keeping every section', () => {
    const r = run({ app: 'ihsan', version: 3, salat: { logs: [] }, anything: { else: 1 } });
    expect(r.success).toBe(true);
    expect(r.data.body.salat).toEqual({ logs: [] });
    expect(r.data.body.anything).toEqual({ else: 1 });
  });
  test.each([
    ['an array', [1, 2]],
    ['no app', { version: 3 }],
    ['another app', { app: 'other', version: 3 }],
    ['no version', { app: 'ihsan' }],
    ['a text version', { app: 'ihsan', version: '3' }],
  ])('refuses %s', (_name, body) => {
    expect(run(body).success).toBe(false);
  });
});
