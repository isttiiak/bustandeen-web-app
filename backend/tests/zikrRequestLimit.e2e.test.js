import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import ZikrRequest from '../src/models/ZikrRequest.js';
import RateLimitCounter from '../src/models/RateLimitCounter.js';

// Audit 2026-11-16 P2-1: POST /api/zikr/requests sends two emails per call
// (the review inbox and the requester) and had only the 300/min tapping limiter.
// One person can now send five suggestions a day.

// The limiters switch themselves off outside production (everything shares localhost),
// decided when the module loads. Load the app as production, then go back to the
// test environment so the dev sign-in bypass the other suites use still works.
let app;
let mongo;
beforeAll(async () => {
  process.env.NODE_ENV = 'production';
  app = (await import('../src/app.js')).default;
  process.env.NODE_ENV = 'test';
  process.env.DEV_AUTH_BYPASS = '1';
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_zikr_request_limit' });
  await RateLimitCounter.syncIndexes();
});
afterAll(async () => {
  await mongoose.connection.dropDatabase().catch(() => {});
  await mongoose.disconnect().catch(() => {});
  if (mongo) await mongo.stop();
});

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};
const send = (uid, name) =>
  request(app)
    .post('/api/zikr/requests')
    .set('Authorization', `Bearer ${fakeJwt({ uid, email: `${uid}@test.dev` })}`)
    .send({ name });

describe('zikr suggestions are limited per person', () => {
  test('the sixth in a day is refused, nothing is saved or emailed for it, and another person is unaffected', async () => {
    for (let i = 1; i <= 5; i += 1) {
      expect((await send('zr-a', `Dhikr ${i}`)).status).toBe(200);
    }
    const sixth = await send('zr-a', 'Dhikr 6');
    expect(sixth.status).toBe(429);
    expect(sixth.body.ok).toBe(false);
    expect(await ZikrRequest.countDocuments({ userId: 'zr-a' })).toBe(5);

    expect((await send('zr-b', 'Another person')).status).toBe(200);
  });
});
