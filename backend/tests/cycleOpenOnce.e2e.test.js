import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import User from '../src/models/User.js';
import CycleLog from '../src/models/CycleLog.js';
import * as cycle from '../src/services/cycle.service.js';

// Audit 2026-11-16 P1-8: "is a cycle already open?" was checked, then a cycle
// was created, with nothing stopping two requests at once from both passing the
// check. A partial unique index now allows one open cycle per person.

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};

let mongo;
beforeAll(async () => {
  process.env.DEV_AUTH_BYPASS = '1';
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_cycle_open' });
  await CycleLog.init();
});
afterAll(async () => {
  await mongoose.connection.dropDatabase().catch(() => {});
  await mongoose.disconnect().catch(() => {});
  if (mongo) await mongo.stop();
});

let n = 0;
const uid = () => `cyc${++n}`;
const open = (u) => CycleLog.countDocuments({ userId: u, endDate: null });

describe('one open cycle per person', () => {
  test('six starts at once on different days leave exactly one open cycle, and nobody gets a 500', async () => {
    const u = uid();
    const days = [
      '2026-03-01',
      '2026-03-02',
      '2026-03-03',
      '2026-03-04',
      '2026-03-05',
      '2026-03-06',
    ];
    const results = await Promise.all(days.map((d) => cycle.startCycle(u, d, 'hayd')));
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    for (const r of results.filter((x) => !x.ok)) expect(r.error).toMatch(/already active/i);
    expect(await open(u)).toBe(1);
  });

  test('the same day twice at once is one cycle and a clear answer, not an exception', async () => {
    const u = uid();
    const results = await Promise.all(
      Array.from({ length: 4 }, () => cycle.startCycle(u, '2026-04-01', 'hayd'))
    );
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(await open(u)).toBe(1);
  });

  test('reopening an ended cycle while another start races it cannot make two open ones', async () => {
    const u = uid();
    const first = await cycle.startCycle(u, '2026-02-01', 'hayd');
    await cycle.endCycle(u, '2026-02-06');
    const results = await Promise.all([
      cycle.editCycleLog(u, String(first.log._id), { endDate: null }),
      cycle.startCycle(u, '2026-03-01', 'hayd'),
    ]);
    expect(await open(u)).toBeLessThanOrEqual(1);
    expect(results.filter((r) => r.ok).length).toBeGreaterThanOrEqual(1);
  });

  test('the database itself refuses a second open cycle, whatever the code does', async () => {
    const u = uid();
    await CycleLog.create({ userId: u, startDate: '2026-01-01', endDate: null });
    await expect(
      CycleLog.create({ userId: u, startDate: '2026-02-01', endDate: null })
    ).rejects.toMatchObject({ code: 11000 });
    // ended cycles are not limited, and another person may have one open
    await CycleLog.create({ userId: u, startDate: '2026-02-01', endDate: '2026-02-05' });
    await CycleLog.create({ userId: u, startDate: '2026-03-01', endDate: '2026-03-05' });
    await CycleLog.create({ userId: `${u}-other`, startDate: '2026-01-01', endDate: null });
  });
});

describe('restoring a backup with two open cycles', () => {
  test('keeps the most recent one open, leaves the other out, and does not fail', async () => {
    const u = uid();
    await User.create({ uid: u, email: `${u}@test.dev` });
    const token = fakeJwt({ uid: u, email: `${u}@test.dev` });
    const res = await request(app)
      .post('/api/user/import')
      .set('Authorization', `Bearer ${token}`)
      .send({
        app: 'ihsan',
        version: 3,
        rayhanah: {
          cycles: [
            { startDate: '2026-01-01', endDate: null, type: 'hayd' },
            { startDate: '2026-02-01', endDate: null, type: 'hayd' },
            { startDate: '2025-12-01', endDate: '2025-12-05', type: 'hayd' },
          ],
        },
      });
    expect(res.status).toBe(200);
    const openOnes = await CycleLog.find({ userId: u, endDate: null });
    expect(openOnes.map((c) => c.startDate)).toEqual(['2026-02-01']);
    expect(await CycleLog.countDocuments({ userId: u })).toBe(2);
    expect(res.body.counts.skippedRows).toBe(1);
  });
});

describe('read-only count of accounts that block the index', () => {
  test('counts accounts with several open cycles without writing anything', async () => {
    const { reportOpenCycles } = await import('../src/scripts/lib/openCycles.js');
    // Build the situation the index forbids by writing around it.
    const u = `${uid()}-dup`;
    await CycleLog.collection.dropIndex('one_open_cycle_per_user');
    try {
      await CycleLog.collection.insertMany([
        { userId: u, startDate: '2026-01-01', endDate: null },
        { userId: u, startDate: '2026-02-01', endDate: null },
        { userId: u, startDate: '2026-03-01', endDate: null },
      ]);
      const before = await CycleLog.countDocuments();
      const report = await reportOpenCycles({ withUids: true });
      expect(report.accountsWithSeveralOpen).toBe(1);
      expect(report.maxOpenForOneAccount).toBe(3);
      expect(report.uids).toEqual([u]);
      expect(await CycleLog.countDocuments()).toBe(before); // nothing written
    } finally {
      await CycleLog.deleteMany({ userId: u });
      await CycleLog.syncIndexes();
    }
  });
});

describe('the index is visible to sync-indexes', () => {
  test('when the live collection lacks it, the dry run lists it as a create', async () => {
    await CycleLog.collection.dropIndex('one_open_cycle_per_user');
    try {
      const { toCreate } = await CycleLog.diffIndexes();
      expect(toCreate).toContainEqual({ userId: 1, endDate: 1 });
    } finally {
      await CycleLog.syncIndexes();
    }
  });
});
