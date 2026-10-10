import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import AdminAccount from '../src/models/AdminAccount.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Same dev-bypass fake-JWT shape as auth.e2e.test.js, plus auth_time (when
// the admin last entered their password) as a real Firebase token carries it.
const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};
const signedInAgo = (seconds) =>
  fakeJwt({ uid: 'session-servant', auth_time: Math.floor(Date.now() / 1000) - seconds });

let mongo;

describe('Admin session limit and re-auth (U8.4)', () => {
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test_admin_session' });
    await AdminAccount.create({
      firebaseUid: 'session-servant',
      email: 'servant@session.dev',
      role: 'servant',
      createdBy: 'test-seed',
    });
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase().catch(() => {});
      await mongoose.disconnect().catch(() => {});
    }
    if (mongo) await mongo.stop();
  });

  test('a sign-in older than 12 hours is refused everywhere', async () => {
    const res = await request(app)
      .get('/api/admin/auth/session')
      .set('X-Admin-Token', signedInAgo(13 * 60 * 60));
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('admin_session_expired');
  });

  test('an hour-old sign-in can read but not delete', async () => {
    const token = signedInAgo(60 * 60);
    const read = await request(app).get('/api/admin/users').set('X-Admin-Token', token);
    expect(read.status).toBe(200);

    for (const [method, url] of [
      ['delete', '/api/admin/users/someone'],
      ['delete', `/api/admin/sadaqah/${new mongoose.Types.ObjectId()}`],
      ['delete', `/api/admin/sadaqah/expenses/${new mongoose.Types.ObjectId()}`],
      ['delete', '/api/admin/sadaqah/quarterly/2026-Q3'],
      ['delete', `/api/admin/zikr-requests/library/${new mongoose.Types.ObjectId()}`],
      ['post', '/api/admin/accounts'],
      ['patch', `/api/admin/accounts/${new mongoose.Types.ObjectId()}/active`],
    ]) {
      const res = await request(app)[method](url).set('X-Admin-Token', token).send({});
      expect({ url, status: res.status, error: res.body.error }).toEqual({
        url,
        status: 401,
        error: 'admin_reauth_required',
      });
    }
  });

  test('a fresh sign-in passes the re-auth gate', async () => {
    const res = await request(app)
      .delete('/api/admin/users/nobody-here')
      .set('X-Admin-Token', signedInAgo(30));
    expect(res.status).toBe(404);
  });
});
