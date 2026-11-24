import { jest } from '@jest/globals';
import { readFileSync } from 'node:fs';
import express from 'express';
import request from 'supertest';
import { requestLogger } from '../src/lib/logger.js';

// Audit 2026-11-16 P2-2: production used morgan('combined'), which writes one line per
// request with the full URL (query included, so receipt signatures and ids), the
// caller's IP address and browser, and a signed-in uid. The replacement keeps only
// what is needed to see a problem: method, route pattern, status and time.

function buildApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(requestLogger());
  app.use((req, _res, next) => {
    req.user = { uid: 'firebase-uid-123' };
    next();
  });
  const sadaqah = express.Router();
  sadaqah.get('/verify/:id', (_req, res) => res.status(404).json({ ok: false }));
  app.use('/api/sadaqah', sadaqah);
  app.get('/api/ok/:id', (_req, res) => res.json({ ok: true }));
  app.get('/api/health', (_req, res) => res.status(503).json({ ok: false }));
  app.options('/api/ok/:id', (_req, res) => res.status(204).end());
  return app;
}

describe('request log', () => {
  let spy;
  beforeEach(() => {
    spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => spy.mockRestore());

  test('a failed request is one line with method, route pattern, status and time, and nothing personal', async () => {
    await request(buildApp())
      .get('/api/sadaqah/verify/id-77?sig=SECRETSIG&email=a@b.co')
      .set('X-Forwarded-For', '203.0.113.9')
      .set('User-Agent', 'SecretBrowser/9');

    expect(spy).toHaveBeenCalledTimes(1);
    const line = spy.mock.calls[0][0];
    const log = JSON.parse(line);
    expect(log).toMatchObject({
      tag: 'http',
      method: 'GET',
      route: '/api/sadaqah/verify/:id',
      status: 404,
    });
    expect(typeof log.ms).toBe('number');
    expect(Object.keys(log).sort()).toEqual(['method', 'ms', 'route', 'status', 'tag', 'ts']);
    for (const secret of [
      'SECRETSIG',
      'a@b.co',
      'id-77',
      '203.0.113.9',
      'SecretBrowser',
      'firebase-uid-123',
    ]) {
      expect(line).not.toContain(secret);
    }
  });

  test('successful requests, preflights and the health check are not logged', async () => {
    const app = buildApp();
    await request(app).get('/api/ok/1');
    await request(app).options('/api/ok/1');
    await request(app).get('/api/health');
    expect(spy).not.toHaveBeenCalled();
  });

  test('the app uses it and no longer uses morgan', () => {
    const src = readFileSync(new URL('../src/app.ts', import.meta.url), 'utf8');
    expect(src).not.toMatch(/morgan/);
    expect(src).toMatch(/requestLogger\(\)/);
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    expect(pkg.dependencies.morgan).toBeUndefined();
  });
});
