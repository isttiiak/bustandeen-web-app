import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { signupCompleteSchema } from '../src/validation/authEmail.schemas.js';

// Audit 2026-11-16 P2-9: (1) a new password needs 8 characters, not 6; (2) a sign-in that has
// been revoked (password reset, "sign out everywhere", account switched off) still passed
// verification until its token ran out, up to an hour. Revocation is now checked where it
// matters: the account-level actions below and the whole admin panel, not every request.

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};
const decode = (jwt) => JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString('utf8'));

const revokedUids = new Set();
const verifyCalls = [];
const firebaseDown = { value: false };

jest.unstable_mockModule('../src/config/firebaseAdmin.js', () => ({
  initFirebaseAdmin: () => {},
  isFirebaseInitialized: () => true,
  verifyFirebaseToken: async (token, checkRevoked = false) => {
    const p = decode(token);
    verifyCalls.push({ uid: p.uid, checkRevoked });
    if (checkRevoked && firebaseDown.value)
      throw Object.assign(new Error('boom'), { code: 'app/network-error' });
    if (checkRevoked && revokedUids.has(p.uid)) {
      throw Object.assign(new Error('revoked'), { code: 'auth/id-token-revoked' });
    }
    return {
      ...p,
      uid: p.uid,
      email_verified: true,
      auth_time: Math.floor(Date.now() / 1000),
      firebase: { sign_in_provider: 'google.com' },
    };
  },
  decodeUnverifiedJwt: () => null,
  getFirebaseProviderData: async () => [],
}));

let app;
let User;
let mongo;
beforeAll(async () => {
  app = (await import('../src/app.js')).default;
  User = (await import('../src/models/User.js')).default;
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_revoked' });
  for (const uid of ['rv-ok', 'rv-revoked']) await User.create({ uid, email: `${uid}@test.dev` });
  revokedUids.add('rv-revoked');
});
afterAll(async () => {
  await mongoose.connection.dropDatabase().catch(() => {});
  await mongoose.disconnect().catch(() => {});
  if (mongo) await mongo.stop();
});

const as = (r, uid) =>
  r.set('Authorization', `Bearer ${fakeJwt({ uid, email: `${uid}@test.dev` })}`);

describe('a new password needs 8 characters', () => {
  const body = (password) => ({ body: { token: 'x'.repeat(40), password } });
  test('7 is refused, 8 is accepted, and 128 is still the top', () => {
    expect(signupCompleteSchema.safeParse(body('abcdef1')).success).toBe(false);
    expect(signupCompleteSchema.safeParse(body('abcdefg1')).success).toBe(true);
    expect(signupCompleteSchema.safeParse(body('a'.repeat(128))).success).toBe(true);
    expect(signupCompleteSchema.safeParse(body('a'.repeat(129))).success).toBe(false);
  });
});

describe('revoked sign-ins', () => {
  test('everyday requests are not slowed down by a revocation check', async () => {
    verifyCalls.length = 0;
    const res = await as(request(app).get('/api/user/me'), 'rv-revoked');
    expect(res.status).toBe(200);
    expect(verifyCalls.every((c) => c.checkRevoked === false)).toBe(true);
  });

  test.each([
    ['get', '/api/user/export'],
    ['post', '/api/user/import'],
    ['post', '/api/user/link-google'],
    ['post', '/api/user/unlink-google'],
    ['patch', '/api/user/primary-email'],
    ['delete', '/api/user/me'],
  ])('%s %s refuses a revoked sign-in', async (method, path) => {
    const res = await as(request(app)[method](path), 'rv-revoked').send({});
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('session_revoked');
  });

  test('the same actions work for a sign-in that is not revoked', async () => {
    const res = await as(request(app).get('/api/user/export'), 'rv-ok');
    expect(res.status).toBe(200);
  });

  test('if Firebase cannot be reached the answer is "try again", not "signed out"', async () => {
    firebaseDown.value = true;
    try {
      const res = await as(request(app).get('/api/user/export'), 'rv-ok');
      expect(res.status).toBe(503);
    } finally {
      firebaseDown.value = false;
    }
  });

  test('the admin panel checks revocation on every request', async () => {
    verifyCalls.length = 0;
    await request(app)
      .get('/api/admin/auth/session')
      .set('X-Admin-Token', fakeJwt({ uid: 'rv-admin', email: 'a@test.dev' }));
    expect(verifyCalls.some((c) => c.uid === 'rv-admin' && c.checkRevoked === true)).toBe(true);
  });
});
