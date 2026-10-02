/**
 * E2E: photo upload path — verifies the Firebase Storage migration contract:
 *   - PATCH /api/user/me with an https photoUrl is accepted
 *   - PATCH /api/user/me with a large data: URL (>2 KB) is rejected
 *   - GET  /api/user/me returns ETag; a matching If-None-Match → 304
 */
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};

let mongo;

const UID = 'photo-test-uid-1';
const TOKEN = fakeJwt({ uid: UID, email: 'photo@test.dev' });

describe('PATCH /api/user/me — photo upload path', () => {
  beforeAll(async () => {
    process.env.DEV_AUTH_BYPASS = '1';
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_photo_test' });
    // Seed the user via auth/verify so the doc exists
    await request(app).post('/api/auth/verify').send({ idToken: TOKEN });
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase().catch(() => {});
      await mongoose.disconnect().catch(() => {});
    }
    if (mongo) await mongo.stop();
  });

  test('accepts an https Firebase Storage URL as photoUrl', async () => {
    const res = await request(app)
      .patch('/api/user/me')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({
        photoUrl:
          'https://firebasestorage.googleapis.com/v0/b/test.appspot.com/o/profile-photos%2Ftest.jpg?alt=media&token=abc123',
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.user.photoUrl).toMatch(/^https:\/\//);
  });

  test('rejects a large base64 data: URL with 400', async () => {
    // Build a data: URL > 2 KB
    const largePayload = 'data:image/jpeg;base64,' + 'A'.repeat(3000);
    const res = await request(app)
      .patch('/api/user/me')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ photoUrl: largePayload });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  test('rejects data:text/html photoUrl regardless of size (XSS guard)', async () => {
    // A short text/html data: URL would have slipped through the old "> 2 KB"
    // check — the MIME-type guard must catch it outright.
    const res = await request(app)
      .patch('/api/user/me')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ photoUrl: 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==' });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  test('GET /api/user/me returns an ETag header', async () => {
    const res = await request(app).get('/api/user/me').set('Authorization', `Bearer ${TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.headers['etag']).toMatch(/^W\/"[0-9]+"/);
  });

  test('GET /api/user/me returns 304 when If-None-Match matches', async () => {
    // First request to get the ETag
    const first = await request(app).get('/api/user/me').set('Authorization', `Bearer ${TOKEN}`);

    const etag = first.headers['etag'];
    expect(etag).toBeTruthy();

    // Second request with matching ETag
    const second = await request(app)
      .get('/api/user/me')
      .set('Authorization', `Bearer ${TOKEN}`)
      .set('If-None-Match', etag);

    expect(second.status).toBe(304);
  });
});

describe('PATCH /api/user/me: preset avatars (no Firebase Storage)', () => {
  const AV_UID = 'avatar-test-uid-1';
  const AV_TOKEN = fakeJwt({ uid: AV_UID, email: 'avatar@test.dev' });
  const patch = (body) =>
    request(app).patch('/api/user/me').set('Authorization', `Bearer ${AV_TOKEN}`).send(body);

  beforeAll(async () => {
    process.env.DEV_AUTH_BYPASS = '1';
    if (mongoose.connection.readyState === 0) {
      mongo = await MongoMemoryServer.create();
      await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_avatar_test' });
    }
    await request(app).post('/api/auth/verify').send({ idToken: AV_TOKEN });
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase().catch(() => {});
      await mongoose.disconnect().catch(() => {});
    }
    if (mongo) await mongo.stop();
  });

  test('an existing photoUrl is untouched by unrelated profile edits', async () => {
    const photo = 'https://lh3.googleusercontent.com/a/test-photo';
    await patch({ photoUrl: photo });
    const res = await patch({ bio: 'hello' });
    expect(res.status).toBe(200);
    expect(res.body.user.photoUrl).toBe(photo);
  });

  test('choosing an avatar stores its id and clears the photo', async () => {
    const res = await patch({ avatarId: 'leaf' });
    expect(res.status).toBe(200);
    expect(res.body.user.avatarId).toBe('leaf');
    expect(res.body.user.photoUrl).toBeUndefined();
  });

  test('choosing a photo again clears the avatar', async () => {
    const res = await patch({ photoUrl: 'https://lh3.googleusercontent.com/a/other' });
    expect(res.status).toBe(200);
    expect(res.body.user.photoUrl).toMatch(/^https:/);
    expect(res.body.user.avatarId).toBeUndefined();
  });

  test('an unknown avatar id is rejected', async () => {
    const res = await patch({ avatarId: 'unicorn' });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  test('the verify response carries avatarId for the navbar', async () => {
    await patch({ avatarId: 'crescent' });
    const res = await request(app).post('/api/auth/verify').send({ idToken: AV_TOKEN });
    expect(res.body.user.avatarId).toBe('crescent');
  });
});
