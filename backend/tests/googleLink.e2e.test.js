import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Audit 2026-11-16 P2-4: POST /api/user/link-google stored the Google uid and email the
// APP sent. Nobody could take an account over with it (the list is only shown), but anyone
// could show a made-up Google address on their profile, and claim another person's Google
// uid so that person later got "already linked to another account". The server now asks
// Firebase which Google account is really linked to the signed-in user.

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};
const decode = (jwt) => JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString('utf8'));

// Firebase's record of which Google account each user has really linked.
const firebaseProviders = new Map();
const state = { initialized: true };

jest.unstable_mockModule('../src/config/firebaseAdmin.js', () => ({
  initFirebaseAdmin: () => {},
  isFirebaseInitialized: () => state.initialized,
  verifyFirebaseToken: async (token) => {
    const p = decode(token);
    return { ...p, uid: p.uid, email_verified: true, firebase: { sign_in_provider: 'google.com' } };
  },
  decodeUnverifiedJwt: (jwt) => {
    try {
      const p = decode(jwt);
      if (!p.uid && p.user_id) p.uid = p.user_id;
      return p;
    } catch {
      return null;
    }
  },
  getFirebaseProviderData: async (uid) => firebaseProviders.get(uid) ?? [],
}));

let app;
let User;
let mongo;
beforeAll(async () => {
  app = (await import('../src/app.js')).default;
  User = (await import('../src/models/User.js')).default;
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_google_link' });
  for (const uid of ['gl-a', 'gl-b', 'gl-victim', 'gl-none']) {
    await User.create({ uid, email: `${uid}@test.dev` });
  }
});
afterAll(async () => {
  await mongoose.connection.dropDatabase().catch(() => {});
  await mongoose.disconnect().catch(() => {});
  if (mongo) await mongo.stop();
});

const link = (uid, body) =>
  request(app)
    .post('/api/user/link-google')
    .set('Authorization', `Bearer ${fakeJwt({ uid, email: `${uid}@test.dev` })}`)
    .send(body);
const stored = async (uid) => (await User.findOne({ uid }).lean()).linkedProviders ?? [];

describe('linking a Google account', () => {
  test('what is stored is what Firebase says, not what the app sent', async () => {
    firebaseProviders.set('gl-a', [
      { providerId: 'google.com', uid: 'g-real-a', email: 'real.a@gmail.com' },
    ]);
    const res = await link('gl-a', { googleEmail: 'ceo@example.org', googleUid: 'g-made-up' });
    expect(res.status).toBe(200);
    expect(await stored('gl-a')).toEqual([
      expect.objectContaining({
        provider: 'google.com',
        providerUid: 'g-real-a',
        email: 'real.a@gmail.com',
      }),
    ]);
  });

  test("claiming someone else's Google uid neither works nor blocks them", async () => {
    firebaseProviders.set('gl-victim', [
      { providerId: 'google.com', uid: 'g-victim', email: 'victim@gmail.com' },
    ]);
    firebaseProviders.set('gl-b', [
      { providerId: 'google.com', uid: 'g-real-b', email: 'b@gmail.com' },
    ]);
    const claim = await link('gl-b', { googleEmail: 'victim@gmail.com', googleUid: 'g-victim' });
    expect(claim.status).toBe(200);
    expect((await stored('gl-b'))[0].providerUid).toBe('g-real-b');

    const victim = await link('gl-victim', {
      googleEmail: 'victim@gmail.com',
      googleUid: 'g-victim',
    });
    expect(victim.status).toBe(200);
    expect((await stored('gl-victim'))[0].providerUid).toBe('g-victim');
  });

  test('a person with no Google account linked at Firebase cannot add one', async () => {
    const res = await link('gl-none', { googleEmail: 'x@gmail.com', googleUid: 'g-x' });
    expect(res.status).toBe(400);
    expect(await stored('gl-none')).toEqual([]);
  });

  test('the same real Google account cannot be linked to two accounts', async () => {
    await User.updateOne({ uid: 'gl-none' }, { $set: { linkedProviders: [] } });
    firebaseProviders.set('gl-none', [
      { providerId: 'google.com', uid: 'g-victim', email: 'victim@gmail.com' },
    ]);
    const res = await link('gl-none', {});
    expect(res.status).toBe(409);
  });

  test('the app no longer has to send anything', async () => {
    await User.updateOne({ uid: 'gl-a' }, { $set: { linkedProviders: [] } });
    const res = await link('gl-a', {});
    expect(res.status).toBe(200);
    expect((await stored('gl-a'))[0].providerUid).toBe('g-real-a');
  });

  test('without Firebase (local development only) the old behaviour stays', async () => {
    state.initialized = false;
    process.env.DEV_AUTH_BYPASS = '1';
    try {
      await User.updateOne({ uid: 'gl-a' }, { $set: { linkedProviders: [] } });
      const res = await link('gl-a', { googleEmail: 'dev@example.org', googleUid: 'dev-uid' });
      expect(res.status).toBe(200);
      expect((await stored('gl-a'))[0].providerUid).toBe('dev-uid');
    } finally {
      state.initialized = true;
      delete process.env.DEV_AUTH_BYPASS;
    }
  });
});
