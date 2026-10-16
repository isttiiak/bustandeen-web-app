import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { checkDatabase, resetDbHealthCache } from '../src/services/health.service.js';

// LT-3: a deep health check that touches MongoDB, for the status page.
let mongo;

describe('Health checks', () => {
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test_health' });
  });

  beforeEach(() => resetDbHealthCache());

  afterAll(async () => {
    await mongoose.disconnect().catch(() => {});
    if (mongo) await mongo.stop();
  });

  test('/api/health stays a no-database check', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('/api/health/deep is 200 while MongoDB answers', async () => {
    const res = await request(app).get('/api/health/deep');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, database: 'up' });
    expect(typeof res.body.latencyMs).toBe('number');
    expect(res.headers['cache-control']).toBe('no-store');
  });

  test('a failing database answers 503 without saying why', async () => {
    const err = jest.spyOn(console, 'error').mockImplementation(() => {});
    const ping = jest
      .spyOn(mongoose.connection.db.admin().constructor.prototype, 'ping')
      .mockRejectedValue(new Error('secret host detail'));
    const res = await request(app).get('/api/health/deep');
    ping.mockRestore();
    err.mockRestore();
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ ok: false, database: 'down', latencyMs: null });
    expect(JSON.stringify(res.body)).not.toContain('secret');
  });

  test('results are cached for a few seconds, so the route cannot load the database', async () => {
    const t0 = Date.now();
    const ping = jest.spyOn(mongoose.connection.db.admin().constructor.prototype, 'ping');
    await checkDatabase(t0);
    await checkDatabase(t0 + 5_000);
    expect(ping).toHaveBeenCalledTimes(1);
    await checkDatabase(t0 + 60_000);
    expect(ping).toHaveBeenCalledTimes(2);
    ping.mockRestore();
  });

  test('a missed heartbeat (readyState flips, client still open) is not down', async () => {
    // Mongoose marks the connection disconnected on one missed heartbeat while
    // the driver reconnects; 2026-10-16 this sent false "Database down" alerts.
    mongoose.connection.readyState = 0;
    const res = await request(app).get('/api/health/deep');
    mongoose.connection.readyState = 1;
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, database: 'up' });
  });

  test('disconnected = down', async () => {
    const err = jest.spyOn(console, 'error').mockImplementation(() => {});
    await mongoose.disconnect();
    const res = await request(app).get('/api/health/deep');
    err.mockRestore();
    expect(res.status).toBe(503);
    expect(res.body.database).toBe('down');
  });
});
