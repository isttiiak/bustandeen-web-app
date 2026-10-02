import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import AdminAccount from '../src/models/AdminAccount.js';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { isStorageNearCap, M0_STORAGE_CAP_BYTES } from '../src/services/adminOps.service.js';

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};

let mongo;
const servantToken = fakeJwt({ uid: 'ops-servant', email: 'servant@test.dev' });
const ansarToken = fakeJwt({ uid: 'ops-ansar', email: 'ansar@test.dev' });

describe('Admin ops — storage usage (DB-03)', () => {
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test_ops_storage' });
    await User.create([
      { uid: 'u1', email: 'u1@test.dev' },
      { uid: 'u2', email: 'u2@test.dev' },
    ]);
    await AdminAccount.create([
      { firebaseUid: 'ops-servant', email: 'servant@test.dev', role: 'servant', createdBy: 't' },
      { firebaseUid: 'ops-ansar', email: 'ansar@test.dev', role: 'ansar', createdBy: 't' },
    ]);
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase().catch(() => {});
      await mongoose.disconnect().catch(() => {});
    }
    if (mongo) await mongo.stop();
  });

  it('returns per-collection sizes and a total against the M0 cap', async () => {
    const res = await request(app).get('/api/admin/ops/storage').set('x-admin-token', servantToken);
    expect(res.status).toBe(200);
    expect(res.body.capBytes).toBe(512 * 1024 * 1024);

    const users = res.body.collections.find((c) => c.name === 'users');
    expect(users.documents).toBe(2);
    expect(users.dataBytes).toBeGreaterThan(0);
    expect(users.indexBytes).toBeGreaterThan(0);
    expect(users.totalBytes).toBe(users.dataBytes + users.indexBytes);

    const sum = res.body.collections.reduce((s, c) => s + c.totalBytes, 0);
    expect(res.body.totalBytes).toBe(sum);
    expect(res.body.usedRatio).toBeCloseTo(sum / res.body.capBytes);
    expect(res.body.warn).toBe(false);
    // Largest first.
    const totals = res.body.collections.map((c) => c.totalBytes);
    expect(totals).toEqual([...totals].sort((a, b) => b - a));
  });

  it('is read-only: document counts are unchanged afterwards', async () => {
    const before = await User.countDocuments();
    await request(app).get('/api/admin/ops/storage').set('x-admin-token', servantToken);
    expect(await User.countDocuments()).toBe(before);
  });

  it('is servant-only', async () => {
    const res = await request(app).get('/api/admin/ops/storage').set('x-admin-token', ansarToken);
    expect(res.status).toBe(403);
  });

  it('warns at 70% of the cap', () => {
    expect(isStorageNearCap(Math.floor(M0_STORAGE_CAP_BYTES * 0.69))).toBe(false);
    expect(isStorageNearCap(Math.ceil(M0_STORAGE_CAP_BYTES * 0.7))).toBe(true);
    expect(isStorageNearCap(M0_STORAGE_CAP_BYTES)).toBe(true);
  });
});
