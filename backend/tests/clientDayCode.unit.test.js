import express from 'express';
import request from 'supertest';
import { z } from 'zod';
import { validate } from '../src/middleware/validate.js';
import { clientToday, replayedClientToday, CLIENT_DAY_CODE } from '../src/validation/clientDay.js';

// Audit 2026-11-16 P0-3: the 400 for a wrong device date carries a stable code,
// so the app can tell the person to fix their clock. Other 400s must not.

const app = express();
app.use(express.json());
app.get('/q', validate(z.object({ query: z.object({ today: clientToday }) })), (_req, res) =>
  res.json({ ok: true })
);
app.post(
  '/replay',
  validate(z.object({ body: z.object({ today: replayedClientToday }) })),
  (_req, res) => res.json({ ok: true })
);
app.get(
  '/n',
  validate(z.object({ query: z.object({ n: z.coerce.number().int() }) })),
  (_req, res) => res.json({ ok: true })
);

const utcDay = (offset = 0) =>
  new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

describe('wrong device date 400', () => {
  test('a far-future today is a 400 with the code and the readable message', async () => {
    const res = await request(app).get('/q?today=2099-01-01');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(CLIENT_DAY_CODE);
    expect(res.body.code).toBe('client_day_mismatch');
    expect(res.body.details[0].message).toMatch(/check the date and time on your device/i);
  });

  test('a phone clock days behind is refused with the code too', async () => {
    const res = await request(app).get(`/q?today=${utcDay(-10)}`);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(CLIENT_DAY_CODE);
  });

  test('a replayed write dated in the future carries the code', async () => {
    const res = await request(app).post('/replay').send({ today: '2099-01-01' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(CLIENT_DAY_CODE);
  });

  test('a believable today passes', async () => {
    expect((await request(app).get(`/q?today=${utcDay(0)}`)).status).toBe(200);
  });

  test('any other validation failure has no code', async () => {
    const res = await request(app).get('/n?n=abc');
    expect(res.status).toBe(400);
    expect(res.body.code).toBeUndefined();
    expect(res.body.error).toBe('Validation failed');
  });
});
