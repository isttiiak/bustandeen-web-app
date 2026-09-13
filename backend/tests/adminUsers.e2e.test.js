import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

const OWNER_EMAIL = 'owner@test.dev';
const STAFF_EMAIL = 'staff@test.dev';
const PASSWORD = 'users-test-password';

let mongo;
let ownerToken;
let staffToken;

const login = async (email) =>
  (await request(app).post('/api/admin/auth/login').send({ email, password: PASSWORD })).body.token;

describe('Admin users — welcome-email backfill (owner only)', () => {
  beforeAll(async () => {
    process.env.ADMIN_EMAILS = `${OWNER_EMAIL},${STAFF_EMAIL}`;
    process.env.ADMIN_OWNER_EMAILS = OWNER_EMAIL;
    process.env.ADMIN_PANEL_PASSWORD = PASSWORD;
    process.env.ADMIN_SESSION_SECRET = 'users-test-session-secret';
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

    ownerToken = await login(OWNER_EMAIL);
    staffToken = await login(STAFF_EMAIL);
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
});
