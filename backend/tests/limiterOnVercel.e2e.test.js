import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Audit 2026-11-16 P2-9: the rate limiters switch themselves off when NODE_ENV is not
// "production" (so local development is not throttled). A deployment whose NODE_ENV was
// wrong (a preview or staging project) would then have no limits at all, so the limits
// also stay on whenever the code is running on Vercel, the same guard the dev sign-in
// bypass already uses.

let mongo;
beforeAll(async () => {
  process.env.VERCEL = '1';
  process.env.NODE_ENV = 'test';
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_limiter_vercel' });
});
afterAll(async () => {
  delete process.env.VERCEL;
  await mongoose.connection.dropDatabase().catch(() => {});
  await mongoose.disconnect().catch(() => {});
  if (mongo) await mongo.stop();
});

test('on Vercel a limiter limits even when NODE_ENV is not production', async () => {
  const { zikrRequestLimiter } = await import('../src/middleware/rateLimiter.js');
  const app = express();
  app.use((req, _res, next) => {
    req.user = { uid: 'vercel-user' };
    next();
  });
  app.post('/x', zikrRequestLimiter, (_req, res) => res.json({ ok: true }));
  for (let i = 0; i < 5; i += 1) expect((await request(app).post('/x')).status).toBe(200);
  expect((await request(app).post('/x')).status).toBe(429);
});
