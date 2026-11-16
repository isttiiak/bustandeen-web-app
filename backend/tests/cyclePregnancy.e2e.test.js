import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { setClientDayBoundForTests } from '../src/validation/clientDay.js';

// This suite replays fixed calendar dates as "today"; the live-clock bound on
// the client day (audit 2026-11-16 P0-3) has its own tests in auditP0.e2e.test.js.
setClientDayBoundForTests(false);
import { MongoMemoryServer } from 'mongodb-memory-server';

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};

let mongo;

describe('Rayhanah Cycle — pregnancy mode', () => {
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

  const token = fakeJwt({ uid: 'preg-1', email: 'preg-1@test.dev', name: 'Preg One' });
  const auth = (r) => r.set('Authorization', `Bearer ${token}`);

  test('turning pregnancy on requires a due date', async () => {
    const res = await auth(request(app).patch('/api/cycle/pregnancy')).send({ active: true });
    expect(res.status).toBe(400);
  });

  test('a real due date computes a sane week count and suspends period prediction', async () => {
    // Two completed hayd cycles so a "next period" prediction would normally exist.
    await auth(request(app).post('/api/cycle/logs')).send({
      startDate: '2026-01-01',
      endDate: '2026-01-06',
      type: 'hayd',
      today: '2026-06-01',
    });
    await auth(request(app).post('/api/cycle/logs')).send({
      startDate: '2026-01-29',
      endDate: '2026-02-03',
      type: 'hayd',
      today: '2026-06-01',
    });

    const before = await auth(request(app).get('/api/cycle/summary?today=2026-06-01'));
    expect(before.body.prediction.nextStart).not.toBeNull();

    const patch = await auth(request(app).patch('/api/cycle/pregnancy')).send({
      active: true,
      dueDate: '2026-09-01',
    });
    expect(patch.status).toBe(200);
    expect(patch.body.pregnancy.active).toBe(true);

    const after = await auth(request(app).get('/api/cycle/summary?today=2026-06-01'));
    expect(after.body.pregnancy.active).toBe(true);
    expect(after.body.pregnancy.dueDate).toBe('2026-09-01');
    expect(after.body.pregnancy.weeksAlong).toBe(26);
    // The exact same cycle history that predicted a next period a moment ago
    // must now be suppressed — periods stop during pregnancy.
    expect(after.body.prediction.nextStart).toBeNull();
  });

  test('turning pregnancy off never requires validation and restores predictions', async () => {
    const off = await auth(request(app).patch('/api/cycle/pregnancy')).send({ active: false });
    expect(off.status).toBe(200);
    expect(off.body.pregnancy.active).toBe(false);

    const after = await auth(request(app).get('/api/cycle/summary?today=2026-06-01'));
    expect(after.body.pregnancy.active).toBe(false);
    expect(after.body.prediction.nextStart).not.toBeNull();
  });
});
