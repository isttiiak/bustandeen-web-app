import { jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoRateLimitStore } from '../src/middleware/mongoRateLimitStore.js';
import RateLimitCounter from '../src/models/RateLimitCounter.js';

// Audit SEC-01: on Vercel every warm instance had its own in-memory counters,
// so "20 AI requests a day" was really "20 per instance". The shared store
// must enforce ONE count across instances. Each `buildInstance()` below is a
// separate app with its own store object, like two serverless instances.

const DAY = 24 * 60 * 60 * 1000;

function buildInstance({ max = 20, windowMs = DAY, name = 'aiUser' } = {}) {
  const app = express();
  app.use(
    rateLimit({
      windowMs,
      max,
      keyGenerator: (req) => req.get('x-test-user') ?? 'anon',
      store: new MongoRateLimitStore(name),
      standardHeaders: true,
      legacyHeaders: false,
      validate: false,
    })
  );
  app.get('/ai', (_req, res) => res.json({ ok: true }));
  return app;
}

let mongo;

describe('MongoRateLimitStore (shared across instances)', () => {
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test_ratelimit' });
    await RateLimitCounter.syncIndexes();
  }, 120_000);

  afterEach(async () => {
    if (mongoose.connection.readyState === 1) await RateLimitCounter.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect().catch(() => {});
    if (mongo) await mongo.stop();
  });

  test('the 21st AI call in a day is rejected even when spread over two instances', async () => {
    // A store error would silently fall back to per-instance counting; fail loudly instead.
    const errors = jest.spyOn(console, 'error').mockImplementation(() => {});
    const instanceA = buildInstance();
    const instanceB = buildInstance();

    for (let i = 0; i < 10; i += 1) {
      expect((await request(instanceA).get('/ai').set('x-test-user', 'uid-1')).status).toBe(200);
      expect((await request(instanceB).get('/ai').set('x-test-user', 'uid-1')).status).toBe(200);
    }

    const blocked = await request(instanceA).get('/ai').set('x-test-user', 'uid-1');
    expect(blocked.status).toBe(429);
    expect(blocked.headers['ratelimit-remaining']).toBe('0');

    // A different user is unaffected.
    expect((await request(instanceB).get('/ai').set('x-test-user', 'uid-2')).status).toBe(200);
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });

  test('concurrent hits from two instances are all counted (atomic increment)', async () => {
    const a = new MongoRateLimitStore('aiChat');
    const b = new MongoRateLimitStore('aiChat');
    a.init({ windowMs: DAY });
    b.init({ windowMs: DAY });

    const results = await Promise.all(
      Array.from({ length: 30 }, (_, i) => (i % 2 ? a : b).increment('uid-9'))
    );
    const counts = results.map((r) => r.totalHits).sort((x, y) => x - y);
    expect(counts).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
    expect(await RateLimitCounter.countDocuments()).toBe(1);
    a.shutdown();
    b.shutdown();
  });

  test('a new window starts after the old one ends', async () => {
    const store = new MongoRateLimitStore('short');
    store.init({ windowMs: 300 });
    expect((await store.increment('ip-1')).totalHits).toBe(1);
    expect((await store.increment('ip-1')).totalHits).toBe(2);
    await new Promise((r) => setTimeout(r, 400));
    const fresh = await store.increment('ip-1');
    expect(fresh.totalHits).toBe(1);
    expect(fresh.resetTime.getTime()).toBeGreaterThan(Date.now());
    store.shutdown();
  });

  test('stores only a keyed hash of the IP/uid, never the raw value, and a TTL cleans up', async () => {
    const store = new MongoRateLimitStore('sadaqahSubmit');
    store.init({ windowMs: DAY });
    await store.increment('203.0.113.7');
    const docs = await RateLimitCounter.find().lean();
    expect(docs).toHaveLength(1);
    expect(docs[0].key).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(docs)).not.toContain('203.0.113.7');

    const ttl = (await RateLimitCounter.collection.indexes()).find((i) => i.key.resetAt === 1);
    expect(ttl.expireAfterSeconds).toBe(0);
    store.shutdown();
  });

  test('get / decrement / resetKey behave like the memory store', async () => {
    const store = new MongoRateLimitStore('import');
    store.init({ windowMs: DAY });
    await store.increment('uid-3');
    await store.increment('uid-3');
    expect((await store.get('uid-3')).totalHits).toBe(2);
    await store.decrement('uid-3');
    expect((await store.get('uid-3')).totalHits).toBe(1);
    await store.resetKey('uid-3');
    expect(await store.get('uid-3')).toBeUndefined();
    store.shutdown();
  });

  test('when MongoDB is down it falls back to a per-instance count immediately', async () => {
    const store = new MongoRateLimitStore('aiUser');
    store.init({ windowMs: DAY });
    await mongoose.disconnect();
    const started = Date.now();
    expect((await store.increment('uid-4')).totalHits).toBe(1);
    expect((await store.increment('uid-4')).totalHits).toBe(2);
    expect(Date.now() - started).toBeLessThan(500); // no 10 s Mongoose buffering
    store.shutdown();
    await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test_ratelimit' });
  });
});
