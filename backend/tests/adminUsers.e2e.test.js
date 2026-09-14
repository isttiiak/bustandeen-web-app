import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import AdminAccount from '../src/models/AdminAccount.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

const OWNER_EMAIL = 'owner@test.dev';
const STAFF_EMAIL = 'staff@test.dev';

// Same dev-bypass fake-JWT shape as auth.e2e.test.js.
const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};

let mongo;
let ownerToken;
let staffToken;

describe('Admin users — directory + welcome-email backfill (servant only)', () => {
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test_admin_users' });

    // Pre-dates the welcome-email feature — no welcomeEmailSentAt at all.
    await User.collection.insertOne({ uid: 'old-1', email: 'old1@test.dev', zikrTypes: [] });
    await User.collection.insertOne({ uid: 'old-2', email: 'old2@test.dev', zikrTypes: [] });
    // Already handled — must be excluded from the backfill.
    await User.create({
      uid: 'already-welcomed',
      email: 'already@test.dev',
      welcomeEmailSentAt: new Date(),
    });

    await AdminAccount.create({
      firebaseUid: 'admin-uid-owner',
      email: OWNER_EMAIL,
      role: 'servant',
      createdBy: 'test-seed',
    });
    await AdminAccount.create({
      firebaseUid: 'admin-uid-staff',
      email: STAFF_EMAIL,
      role: 'ansar',
      createdBy: 'test-seed',
    });
    ownerToken = fakeJwt({ uid: 'admin-uid-owner', email: OWNER_EMAIL });
    staffToken = fakeJwt({ uid: 'admin-uid-staff', email: STAFF_EMAIL });
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase().catch(() => {});
      await mongoose.disconnect().catch(() => {});
    }
    if (mongo) await mongo.stop();
  });

  test('a non-owner admin cannot even check the backfill status', async () => {
    const res = await request(app)
      .get('/api/admin/users/welcome-backfill')
      .set('X-Admin-Token', staffToken);
    expect(res.status).toBe(403);
  });

  test('owner sees the correct count of users missing the welcome email', async () => {
    const res = await request(app)
      .get('/api/admin/users/welcome-backfill')
      .set('X-Admin-Token', ownerToken);
    expect(res.status).toBe(200);
    expect(res.body.missing).toBe(2);
  });

  test('a non-owner admin cannot trigger the send', async () => {
    const res = await request(app)
      .post('/api/admin/users/welcome-backfill')
      .set('X-Admin-Token', staffToken);
    expect(res.status).toBe(403);
  });

  test('owner triggers the send; every missing user is marked and none are double-counted', async () => {
    const res = await request(app)
      .post('/api/admin/users/welcome-backfill')
      .set('X-Admin-Token', ownerToken);
    expect(res.status).toBe(200);
    expect(res.body.sent).toBe(2);
    expect(res.body.remaining).toBe(0);

    const old1 = await User.findOne({ uid: 'old-1' });
    const old2 = await User.findOne({ uid: 'old-2' });
    expect(old1.welcomeEmailSentAt).toBeTruthy();
    expect(old2.welcomeEmailSentAt).toBeTruthy();

    const second = await request(app)
      .get('/api/admin/users/welcome-backfill')
      .set('X-Admin-Token', ownerToken);
    expect(second.body.missing).toBe(0);
  });

  test('an ansar cannot list users — Servant-only per requireServant', async () => {
    const res = await request(app).get('/api/admin/users').set('X-Admin-Token', staffToken);
    expect(res.status).toBe(403);
  });

  test('servant lists users, newest first, with total count', async () => {
    const res = await request(app).get('/api/admin/users').set('X-Admin-Token', ownerToken);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.users).toHaveLength(3);
    expect(res.body.users.map((u) => u.uid)).toContain('old-1');
  });

  test('servant search filters by email', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .query({ search: 'already@test.dev' })
      .set('X-Admin-Token', ownerToken);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.users[0].uid).toBe('already-welcomed');
  });
});
