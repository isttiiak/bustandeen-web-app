import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import User from '../src/models/User.js';

// The dev / test sign-in (DEV_AUTH_BYPASS) reads the token without verifying it, so its
// uid is the request's own text. It must be a plain, non-empty string: an object such as
// {"$ne": null} reached every query as a MongoDB operator ("any user"). Found tracing the
// CodeQL js/sql-injection alerts (2026-11-28). Production verifies tokens with Firebase.

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};
const bearer = (payload) => ({ Authorization: `Bearer ${fakeJwt(payload)}` });

let mongo;
beforeAll(async () => {
  process.env.DEV_AUTH_BYPASS = '1';
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test_dev_auth_uid' });
  await User.create({ uid: 'real-user', email: 'real@test.dev', gender: 'female' });
});
afterAll(async () => {
  await mongoose.connection.dropDatabase().catch(() => {});
  await mongoose.disconnect().catch(() => {});
  if (mongo) await mongo.stop();
});

const BAD_UIDS = [{ $ne: null }, { $gt: '' }, 42, '', ['real-user'], null];

describe('the dev sign-in accepts only a plain string uid', () => {
  test.each(BAD_UIDS.map((u) => [JSON.stringify(u), u]))(
    'a protected route refuses uid %s',
    async (_label, uid) => {
      const res = await request(app)
        .get('/api/user/me')
        .set(bearer({ uid, email: 'x@test.dev' }));
      expect(res.status).toBe(401);
      expect(JSON.stringify(res.body)).not.toContain('real@test.dev');
    }
  );

  test.each(BAD_UIDS.map((u) => [JSON.stringify(u), u]))(
    'sign-in (/api/auth/verify) refuses uid %s',
    async (_label, uid) => {
      const token = fakeJwt({ uid, email: 'x@test.dev' });
      const res = await request(app)
        .post('/api/auth/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({ token });
      expect(res.status).toBe(401);
    }
  );

  test('a plain uid still works, and the token cannot swap in another one', async () => {
    const ok = await request(app)
      .get('/api/user/me')
      .set(bearer({ uid: 'real-user', email: 'real@test.dev' }));
    expect(ok.status).toBe(200);
    expect(ok.body.user?.uid ?? ok.body.uid).toBe('real-user');
  });
});
