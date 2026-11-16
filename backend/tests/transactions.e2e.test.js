import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import User from '../src/models/User.js';
import ZikrDaily from '../src/models/ZikrDaily.js';
import QuranLog from '../src/models/QuranLog.js';
import QuranProfile from '../src/models/QuranProfile.js';
import ClientOp from '../src/models/ClientOp.js';
import { runInTransaction, afterCommit, inTransaction } from '../src/utils/transaction.js';

// Audit 2026-11-16 P0-5: a write that fails half way must leave nothing behind,
// so the client's retry (same X-Client-Op-Id) counts once, not twice.

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};
const token = (uid) => fakeJwt({ uid, email: `${uid}@test.dev`, name: uid });
const as = (r, uid) => r.set('Authorization', `Bearer ${token(uid)}`);
const TODAY = new Date().toISOString().slice(0, 10);

let mongo;

const dayTotal = async (uid) => {
  const rows = await ZikrDaily.find({ userId: uid }).lean();
  return rows.reduce((n, r) => n + r.count, 0);
};
const batch = (uid, opId, amount, zikrType = 'SubhanAllah') => {
  const r = as(request(app).post('/api/zikr/increment/batch'), uid);
  if (opId) r.set('X-Client-Op-Id', opId);
  return r.send({ increments: [{ zikrType, amount }] });
};

describe('P0-5 transactions', () => {
  beforeAll(async () => {
    process.env.DEV_AUTH_BYPASS = '1';
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test' });
    await ClientOp.syncIndexes();
    await ZikrDaily.syncIndexes();
    for (const uid of ['tx-zikr', 'tx-plain', 'tx-conc', 'tx-quran']) {
      await request(app)
        .post('/api/auth/verify')
        .send({ idToken: token(uid) });
    }
    // The default test DB has no collections yet; create the ones used below.
    await Promise.all(
      [QuranLog, QuranProfile, ZikrDaily, ClientOp].map((m) => m.createCollection())
    );
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase().catch(() => {});
      await mongoose.disconnect().catch(() => {});
    }
    if (mongo) await mongo.stop();
  });

  afterEach(() => jest.restoreAllMocks());

  test('zikr: a 5xx after the day bucket was written leaves nothing, and the retry counts once', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    // The lifetime-totals write is the second write of the request.
    jest.spyOn(User, 'updateOne').mockRejectedValueOnce(new Error('totals write failed'));

    const first = await batch('tx-zikr', 'op-tx-zikr-0001', 33);
    expect(first.status).toBe(500);
    expect(await dayTotal('tx-zikr')).toBe(0); // before the fix: 33 stayed
    expect(await ClientOp.findOne({ uid: 'tx-zikr', opId: 'op-tx-zikr-0001' })).toBeNull();

    jest.restoreAllMocks();
    const retry = await batch('tx-zikr', 'op-tx-zikr-0001', 33);
    expect(retry.status).toBe(200);
    expect(retry.body.totalCount).toBe(33);
    expect(await dayTotal('tx-zikr')).toBe(33); // before the fix: 66

    const again = await batch('tx-zikr', 'op-tx-zikr-0001', 33);
    expect(again.headers['idempotent-replayed']).toBe('true');
    expect(await dayTotal('tx-zikr')).toBe(33);
  });

  test('zikr: the op record is stored in the same transaction as the counts', async () => {
    await batch('tx-zikr', 'op-tx-zikr-0002', 7);
    const row = await ClientOp.findOne({ uid: 'tx-zikr', opId: 'op-tx-zikr-0002' }).lean();
    expect(row.status).toBe('done');
    expect(row.body.totalCount).toBe(40);
  });

  test('without an op id the write is still all-or-nothing', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(User, 'updateOne').mockRejectedValueOnce(new Error('totals write failed'));
    const res = await batch('tx-plain', undefined, 10);
    expect(res.status).toBe(500);
    expect(await dayTotal('tx-plain')).toBe(0);
  });

  test('zikr: concurrent flushes of the same user all apply (conflicts are retried)', async () => {
    const results = await Promise.all(
      Array.from({ length: 6 }, (_, i) => batch('tx-conc', `op-tx-conc-000${i}`, 5, 'Fresh'))
    );
    expect(results.map((r) => r.status)).toEqual([200, 200, 200, 200, 200, 200]);
    expect(await dayTotal('tx-conc')).toBe(30);
    const user = await User.findOne({ uid: 'tx-conc' }).lean();
    expect(user.totalCount).toBe(30);
  });

  test('quran read-ayat: a failure after the day log was written leaves nothing, the retry counts once', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    // Make sure the profile exists, so the failing save is the one in the handler.
    await as(request(app).post('/api/quran/read-ayat'), 'tx-quran').send({
      date: TODAY,
      count: 0,
    });
    const send = () =>
      as(request(app).post('/api/quran/read-ayat'), 'tx-quran')
        .set('X-Client-Op-Id', 'op-tx-quran-0001')
        .send({ date: TODAY, count: 5, surah: 1, advanceKhatm: true });

    jest
      .spyOn(QuranProfile.prototype, 'save')
      .mockRejectedValueOnce(new Error('profile save failed'));
    const first = await send();
    expect(first.status).toBe(500);
    const log = await QuranLog.findOne({ userId: 'tx-quran', date: TODAY }).lean();
    expect(log?.ayat ?? 0).toBe(0); // before the fix: 5 stayed

    jest.restoreAllMocks();
    const retry = await send();
    expect(retry.status).toBe(200);
    expect(retry.body.todayAyat).toBe(5); // before the fix: 10
    expect((await QuranProfile.findOne({ userId: 'tx-quran' }).lean()).currentAyah).toBe(5);
  });

  describe('runInTransaction / afterCommit', () => {
    const Probe = mongoose.model('TxProbe', new mongoose.Schema({ n: Number }));
    beforeAll(() => Probe.createCollection());

    test('rolls back on error and skips the after-commit steps', async () => {
      const ran = jest.fn();
      await expect(
        runInTransaction(async () => {
          await Probe.create([{ n: 1 }]);
          await afterCommit(ran);
          throw new Error('boom');
        })
      ).rejects.toThrow('boom');
      expect(await Probe.countDocuments({ n: 1 })).toBe(0);
      expect(ran).not.toHaveBeenCalled();
    });

    test('commits, returns the result and runs after-commit steps once', async () => {
      const ran = jest.fn();
      const out = await runInTransaction(async () => {
        expect(inTransaction()).toBe(true);
        await Probe.create([{ n: 2 }]);
        await afterCommit(ran);
        return 'done';
      });
      expect(out).toBe('done');
      expect(inTransaction()).toBe(false);
      expect(await Probe.countDocuments({ n: 2 })).toBe(1);
      expect(ran).toHaveBeenCalledTimes(1);
    });

    test('an after-commit step that throws does not undo or fail the commit', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      await runInTransaction(async () => {
        await Probe.create([{ n: 3 }]);
        await afterCommit(() => {
          throw new Error('analytics down');
        });
      });
      expect(await Probe.countDocuments({ n: 3 })).toBe(1);
    });
  });
});
