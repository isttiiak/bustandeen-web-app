import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../src/models/User.js';

// T3.3 onboarding: only accounts created from now on get onboardingRequired
// (full-screen first run); older accounts are offered a Home card. onboardedAt
// records the first finish/skip/dismiss and is never overwritten.

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};

let mongo;

describe('Onboarding flags', () => {
  const newUid = 'onb-new';
  const newToken = fakeJwt({ uid: newUid, email: 'onb-new@test.dev' });
  const oldUid = 'onb-old';
  const oldToken = fakeJwt({ uid: oldUid, email: 'onb-old@test.dev' });

  beforeAll(async () => {
    process.env.DEV_AUTH_BYPASS = '1';
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test' });
    // An account from before onboarding shipped: no onboarding fields at all.
    await User.collection.insertOne({
      uid: oldUid,
      email: 'onb-old@test.dev',
      displayName: 'Old',
      city: 'Dhaka',
      hijriOffset: -1,
      dayStartMode: 'maghrib',
      totalCount: 500,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    });
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase().catch(() => {});
      await mongoose.disconnect().catch(() => {});
    }
    if (mongo) await mongo.stop();
  });

  test('a new account is created with onboardingRequired and no onboardedAt', async () => {
    const res = await request(app).post('/api/auth/verify').send({ idToken: newToken });
    expect(res.status).toBe(200);
    expect(res.body.user.onboardingRequired).toBe(true);
    expect(res.body.user.onboardedAt).toBeNull();

    const me = await request(app).get('/api/user/me').set('Authorization', `Bearer ${newToken}`);
    expect(me.body.user.onboardingRequired).toBe(true);
    expect(me.body.user.onboardedAt).toBeNull();
  });

  test('an existing account signing in is not flagged and keeps its data', async () => {
    const res = await request(app).post('/api/auth/verify').send({ idToken: oldToken });
    expect(res.status).toBe(200);
    expect(res.body.user.onboardingRequired).toBe(false);
    expect(res.body.user.onboardedAt).toBeNull();

    const doc = await User.findOne({ uid: oldUid }).lean();
    expect(doc.onboardingRequired).toBeUndefined();
    expect(doc.city).toBe('Dhaka');
    expect(doc.hijriOffset).toBe(-1);
    expect(doc.dayStartMode).toBe('maghrib');
    expect(doc.totalCount).toBe(500);
  });

  test('PATCH onboarded: true records the first time only', async () => {
    const first = await request(app)
      .patch('/api/user/me')
      .set('Authorization', `Bearer ${newToken}`)
      .send({ onboarded: true });
    expect(first.status).toBe(200);
    const at = first.body.user.onboardedAt;
    expect(typeof at).toBe('string');

    await new Promise((r) => setTimeout(r, 5));
    const second = await request(app)
      .patch('/api/user/me')
      .set('Authorization', `Bearer ${newToken}`)
      .send({ onboarded: true, city: 'Sylhet' });
    expect(second.status).toBe(200);
    expect(second.body.user.onboardedAt).toBe(at);
    expect(second.body.user.city).toBe('Sylhet');

    // Signing in again never resets it.
    const again = await request(app).post('/api/auth/verify').send({ idToken: newToken });
    expect(again.body.user.onboardedAt).toBe(at);
    expect(again.body.user.onboardingRequired).toBe(true);
  });

  test('a Home-card dismissal on an existing account sets onboardedAt', async () => {
    const res = await request(app)
      .patch('/api/user/me')
      .set('Authorization', `Bearer ${oldToken}`)
      .send({ onboarded: true });
    expect(res.status).toBe(200);
    expect(res.body.user.onboardedAt).toBeTruthy();
    expect(res.body.user.onboardingRequired).toBe(false);
  });

  test('onboarded only accepts true', async () => {
    for (const bad of [false, 'yes', 1, null]) {
      const res = await request(app)
        .patch('/api/user/me')
        .set('Authorization', `Bearer ${newToken}`)
        .send({ onboarded: bad });
      expect(res.status).toBe(400);
    }
  });
});
