import { jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { globalErrorHandler } from '../src/middleware/errorHandler.js';
import { hashUid } from '../src/lib/logger.js';

// Audit BE-01: production 5xx errors must be logged (they used to vanish),
// as one JSON line that never carries the request body, the query string, the
// concrete URL ids or the raw uid.

const SECRET_NOTE = 'private cycle note: should never be logged';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { uid: 'firebase-uid-123' };
    next();
  });
  app.post('/api/cycle/days/:date', () => {
    throw new Error('Mongo exploded');
  });
  app.get('/api/zikr/bad', (_req, _res, next) => {
    const err = new Error('Not allowed');
    err.statusCode = 403;
    next(err);
  });
  app.use((err, req, res, next) => globalErrorHandler(err, req, res, next));
  return app;
}

describe('production error logging', () => {
  const originalEnv = process.env.NODE_ENV;
  let spy;

  beforeEach(() => {
    process.env.NODE_ENV = 'production';
    spy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    spy.mockRestore();
  });

  test('a 500 is logged once as structured JSON, with the route pattern and a hashed uid', async () => {
    const res = await request(buildApp())
      .post('/api/cycle/days/1999-01-02?token=abc')
      .send({ note: SECRET_NOTE });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ ok: false, error: 'Internal Server Error' });
    expect(spy).toHaveBeenCalledTimes(1);

    const line = spy.mock.calls[0][0];
    const log = JSON.parse(line);
    expect(log).toMatchObject({
      level: 'error',
      method: 'POST',
      route: '/api/cycle/days/:date',
      status: 500,
      errName: 'Error',
      message: 'Mongo exploded',
    });
    expect(log.uid).toBe(hashUid('firebase-uid-123'));
    expect(log.uid).toMatch(/^[0-9a-f]{16}$/);
    expect(Array.isArray(log.stack)).toBe(true);

    expect(line).not.toContain(SECRET_NOTE);
    expect(line).not.toContain('firebase-uid-123');
    expect(line).not.toContain('1999-01-02');
    expect(line).not.toContain('token=abc');
  });

  test('4xx errors are not logged as server errors', async () => {
    const res = await request(buildApp()).get('/api/zikr/bad');
    expect(res.status).toBe(403);
    expect(spy).not.toHaveBeenCalled();
  });
});
