import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import AdminAccount from '../src/models/AdminAccount.js';
import AdminAuditLog from '../src/models/AdminAuditLog.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};

let mongo;
const servant = fakeJwt({ uid: 'audit-servant' });
const ansar = fakeJwt({ uid: 'audit-ansar' });

const entry = (action, actorEmail = 'servant@audit.dev') => ({
  actorEmail,
  actorRole: actorEmail.startsWith('servant') ? 'servant' : 'ansar',
  action,
  targetType: 'X',
  targetId: 'x1',
});

describe('Audit log filters (U8.6)', () => {
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test_audit_log' });
    await AdminAccount.create([
      { firebaseUid: 'audit-servant', email: 'servant@audit.dev', role: 'servant', createdBy: 's' },
      {
        firebaseUid: 'audit-ansar',
        email: 'ansar@audit.dev',
        role: 'ansar',
        ansarDomain: 'sadaqah',
        createdBy: 's',
      },
    ]);
    await AdminAuditLog.create([
      entry('donation.verify', 'ansar@audit.dev'),
      entry('expense.add', 'ansar@audit.dev'),
      entry('zikrRequest.approve'),
      entry('user.delete'),
      entry('mailbox.reply'),
      // Prefix lookalike: must not count as the "user" area.
      entry('userish.thing'),
    ]);
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase().catch(() => {});
      await mongoose.disconnect().catch(() => {});
    }
    if (mongo) await mongo.stop();
  });

  const list = (query) =>
    request(app).get('/api/admin/audit-log').query(query).set('X-Admin-Token', servant);

  test('only the Servant can read it', async () => {
    const res = await request(app).get('/api/admin/audit-log').set('X-Admin-Token', ansar);
    expect(res.status).toBe(403);
  });

  test('area filter picks the actions of that area', async () => {
    const sadaqah = await list({ area: 'sadaqah' });
    expect(sadaqah.body.entries.map((e) => e.action).sort()).toEqual([
      'donation.verify',
      'expense.add',
    ]);
    const users = await list({ area: 'users' });
    expect(users.body.entries.map((e) => e.action)).toEqual(['user.delete']);
    expect(users.body.total).toBe(1);
  });

  test('an unknown area is ignored, not used as a pattern', async () => {
    const res = await list({ area: '.*' });
    expect(res.body.total).toBe(6);
  });

  test('actor filter ignores case and combines with area', async () => {
    const res = await list({ actor: 'ANSAR@audit.dev', area: 'sadaqah' });
    expect(res.body.total).toBe(2);
    const none = await list({ actor: 'ansar@audit.dev', area: 'zikr' });
    expect(none.body.total).toBe(0);
  });
});
