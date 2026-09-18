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

describe('GET /connect/:code — bot-only invite-link preview', () => {
  beforeAll(async () => {
    process.env.DEV_AUTH_BYPASS = '1';
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test' });
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase().catch(() => {});
      await mongoose.disconnect().catch(() => {});
    }
    if (mongo) await mongo.stop();
  });

  const tokenAmir = fakeJwt({ uid: 'amir-preview', email: 'amir-preview@test.dev', name: 'Amir' });
  const tokenXss = fakeJwt({
    uid: 'xss-preview',
    email: 'xss-preview@test.dev',
    name: 'A&B <script>alert(1)</script>',
  });

  let amirCode;
  let xssCode;

  test('unknown code falls back to generic site branding, not an error', async () => {
    const res = await request(app).get('/connect/this-code-does-not-exist');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.headers['x-robots-tag']).toBe('noindex, nofollow');
    expect(res.text).toContain('Bustandeen - Nourish Your Deen');
    expect(res.text).toContain('og:image');
  });

  test("valid code is personalized with the inviter's real name", async () => {
    await request(app).post('/api/auth/verify').send({ idToken: tokenAmir });
    const summary = await request(app)
      .get('/api/social/summary?today=2026-09-10&timezoneOffset=360')
      .set('Authorization', `Bearer ${tokenAmir}`);
    amirCode = summary.body.inviteCode;
    expect(amirCode).toMatch(/^[A-Za-z0-9_-]{6,}$/);

    const res = await request(app).get(`/connect/${amirCode}`);
    expect(res.status).toBe(200);
    expect(res.text).toContain('Amir invited you to Bustandeen');
    expect(res.text).toContain('Join Amir on Bustandeen');
  });

  test('a display name with HTML metacharacters is escaped, not injected raw', async () => {
    await request(app).post('/api/auth/verify').send({ idToken: tokenXss });
    const summary = await request(app)
      .get('/api/social/summary?today=2026-09-10&timezoneOffset=360')
      .set('Authorization', `Bearer ${tokenXss}`);
    xssCode = summary.body.inviteCode;

    const res = await request(app).get(`/connect/${xssCode}`);
    expect(res.status).toBe(200);
    // The raw, unescaped payload must never appear verbatim in the response.
    expect(res.text).not.toContain('<script>alert(1)</script>');
    // The escaped form should be present instead.
    expect(res.text).toContain('&lt;script&gt;');
    expect(res.text).toContain('A&amp;B');
  });
});
