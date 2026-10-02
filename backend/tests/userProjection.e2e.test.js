import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../src/models/User.js';
import { encryptJson } from '../src/utils/fieldCrypto.js';

// /api/user/me (and the other user routes + auth/verify) return a whitelisted
// projection (services/user.service.ts toClientUser), never the raw document.
// The encrypted BYO Groq key and admin bookkeeping must stay server-side.

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};

const SERVER_ONLY = [
  'groqApiKeyEnc',
  'groqApiKeySetAt',
  'welcomeEmailSentAt',
  'reengagementEmailSentAt',
  'reengagementEmailCount',
  'lastActiveAt',
  'disabled',
  'disabledAt',
  'disabledReason',
  'zikrTotals',
  'zikrTypes',
  'salatResetHistory',
  'prefs',
  '_id',
  '__v',
];

const expectNoServerOnlyFields = (user) => {
  expect(user).toBeTruthy();
  for (const key of SERVER_ONLY) expect(user).not.toHaveProperty(key);
};

let mongo;

describe('User API response projection', () => {
  const uid = 'proj-u1';
  const token = fakeJwt({ uid, email: 'proj@test.dev' });

  beforeAll(async () => {
    process.env.DEV_AUTH_BYPASS = '1';
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test' });

    const verify = await request(app).post('/api/auth/verify').send({ idToken: token });
    expect(verify.status).toBe(200);
    await User.updateOne(
      { uid },
      {
        $set: {
          groqApiKeyEnc: encryptJson('gsk_test_not_a_real_key'),
          groqApiKeySetAt: new Date(),
          welcomeEmailSentAt: new Date(),
          reengagementEmailSentAt: new Date(),
          reengagementEmailCount: 2,
          disabledReason: 'old note',
          'zikrTotals.SubhanAllah': 33,
          avatarId: 'olive',
        },
      }
    );
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase().catch(() => {});
      await mongoose.disconnect().catch(() => {});
    }
    if (mongo) await mongo.stop();
  });

  test('GET /api/user/me omits groqApiKeyEnc and other server-only fields', async () => {
    const res = await request(app).get('/api/user/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.uid).toBe(uid);
    expect(res.body.user.dayStartMode).toBe('fajr');
    expect(res.body.user.avatarId).toBe('olive');
    expectNoServerOnlyFields(res.body.user);
    expect(JSON.stringify(res.body)).not.toContain('groqApiKey');
  });

  test('PATCH /api/user/me omits groqApiKeyEnc and other server-only fields', async () => {
    const res = await request(app)
      .patch('/api/user/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ displayName: 'Projected', city: 'Dhaka' });
    expect(res.status).toBe(200);
    expect(res.body.user.displayName).toBe('Projected');
    expect(res.body.user.city).toBe('Dhaka');
    expect(res.body.user.avatarId).toBe('olive');
    expectNoServerOnlyFields(res.body.user);
    expect(JSON.stringify(res.body)).not.toContain('groqApiKey');

    // The key itself is untouched in the DB.
    const doc = await User.findOne({ uid });
    expect(doc.groqApiKeyEnc).toBeTruthy();
  });

  test('POST /api/auth/verify omits server-only fields', async () => {
    const res = await request(app).post('/api/auth/verify').send({ idToken: token });
    expect(res.status).toBe(200);
    expect(res.body.user.uid).toBe(uid);
    expect(res.body.user.avatarId).toBe('olive');
    expectNoServerOnlyFields(res.body.user);
  });

  test('GET /api/user/me weak ETag still yields 304 on a match', async () => {
    const first = await request(app).get('/api/user/me').set('Authorization', `Bearer ${token}`);
    const etag = first.headers.etag;
    expect(etag).toMatch(/^W\/"\d+"$/);

    const second = await request(app)
      .get('/api/user/me')
      .set('Authorization', `Bearer ${token}`)
      .set('If-None-Match', etag);
    expect(second.status).toBe(304);

    // A profile change moves updatedAt, so the old tag no longer matches.
    await request(app)
      .patch('/api/user/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ occupation: 'Teacher' });
    const third = await request(app)
      .get('/api/user/me')
      .set('Authorization', `Bearer ${token}`)
      .set('If-None-Match', etag);
    expect(third.status).toBe(200);
    expect(third.body.user.occupation).toBe('Teacher');
  });
});
