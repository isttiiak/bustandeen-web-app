import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { z } from 'zod';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { validate } from '../src/middleware/validate.js';
import AdminAccount from '../src/models/AdminAccount.js';
import GlobalZikrLibraryItem from '../src/models/GlobalZikrLibraryItem.js';

// Audit 2026-11-16 P0-10: validate() hands controllers the PARSED body, so a key
// the schema does not name never reaches them.

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};

describe('validate() body', () => {
  const schema = z.object({
    body: z.object({
      name: z.string().trim(),
      amount: z.coerce.number().default(1),
    }),
  });
  const mini = express();
  mini.use(express.json());
  mini.post('/b', validate(schema), (req, res) => res.json(req.body));
  mini.post('/nobody', validate(z.object({ query: z.object({}).passthrough() })), (req, res) =>
    res.json(req.body ?? null)
  );

  test('a key the schema does not name is dropped', async () => {
    const res = await request(mini).post('/b').send({ name: 'x', isAdmin: true, role: 'servant' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ name: 'x', amount: 1 });
  });

  test('parsed values (trim, coercion, default) are what the controller sees', async () => {
    const res = await request(mini).post('/b').send({ name: '  padded  ', amount: '5' });
    expect(res.body).toEqual({ name: 'padded', amount: 5 });
  });

  test('a schema with no body leaves the request body as it arrived', async () => {
    const res = await request(mini).post('/nobody').send({ kept: 1 });
    expect(res.body).toEqual({ kept: 1 });
  });

  test('an invalid body is still a 400 and no handler runs', async () => {
    const res = await request(mini).post('/b').send({ amount: 3 });
    expect(res.status).toBe(400);
  });
});

describe('admin library edit cannot set fields outside the schema', () => {
  let mongo;
  const adminToken = fakeJwt({ uid: 'lib-admin-uid', email: 'lib-admin@test.dev' });

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test_validate_body' });
    await AdminAccount.create({
      firebaseUid: 'lib-admin-uid',
      email: 'lib-admin@test.dev',
      role: 'servant',
      createdBy: 'test-seed',
    });
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase().catch(() => {});
      await mongoose.disconnect().catch(() => {});
    }
    if (mongo) await mongo.stop();
  });

  test('PATCH /library/:id applies the named fields and ignores addedBy, requestId and category', async () => {
    const item = await GlobalZikrLibraryItem.create({
      name: 'Original',
      arabic: 'سُبْحَانَ اللَّهِ',
      meaning: 'Glory be to Allah',
      source: 'Muslim 2691',
      sourceUrl: 'https://sunnah.com/muslim:2691',
      category: 'tasbih',
      addedBy: 'first-admin@test.dev',
    });
    const res = await request(app)
      .patch(`/api/admin/zikr-requests/library/${item._id}`)
      .set('X-Admin-Token', adminToken)
      .send({
        name: 'Edited',
        addedBy: 'attacker@test.dev',
        category: 'asma',
        requestId: new mongoose.Types.ObjectId().toString(),
      });
    expect(res.status).toBe(200);

    const stored = await GlobalZikrLibraryItem.findById(item._id).lean();
    expect(stored.name).toBe('Edited');
    expect(stored.addedBy).toBe('first-admin@test.dev'); // before the fix: attacker@test.dev
    expect(stored.category).toBe('tasbih'); // before the fix: asma
    expect(stored.requestId).toBeUndefined();
  });
});
