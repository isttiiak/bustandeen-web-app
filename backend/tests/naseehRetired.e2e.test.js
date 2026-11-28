import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { retireNaseeh } from '../src/migrations/003-retire-naseeh.js';

// Naseeh (the Groq-based AI companion) was retired 2026-11-28.

let mongo;
beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test_naseeh_retired' });
});
afterAll(async () => {
  await mongoose.connection.dropDatabase().catch(() => {});
  await mongoose.disconnect().catch(() => {});
  if (mongo) await mongo.stop();
});

describe('retired Naseeh endpoints', () => {
  test.each([
    ['post', '/api/ai/suggest'],
    ['put', '/api/ai/groq-key'],
    ['get', '/api/naseeh/plan'],
    ['post', '/api/naseeh/ask'],
    ['post', '/api/natural-log/parse'],
  ])('%s %s answers 410 Gone, with or without a token', async (method, path) => {
    for (const auth of [false, true]) {
      const req = request(app)[method](path);
      const res = await (auth ? req.set('Authorization', 'Bearer x') : req).send({});
      expect(res.status).toBe(410);
      expect(res.body.ok).toBe(false);
    }
  });
});

describe('migration 003-retire-naseeh', () => {
  const users = () => mongoose.connection.db.collection('users');
  beforeEach(async () => {
    await users().deleteMany({});
    await users().insertMany([
      { uid: 'a', groqApiKeyEnc: 'x', groqApiKeySetAt: new Date(), aiEnabled: true },
      { uid: 'b', aiEnabled: true },
      { uid: 'c', aiEnabled: false, name: 'keep' },
    ]);
  });

  test('a dry run only counts', async () => {
    const out = await retireNaseeh.up({ db: mongoose.connection.db, apply: false });
    expect(out).toEqual({ usersWithGroqKey: 1, usersWithKeyFields: 1, usersWithAiOn: 2 });
    expect(await users().countDocuments({ groqApiKeyEnc: { $exists: true } })).toBe(1);
  });

  test('apply removes the keys, turns AI off, touches nothing else, and is idempotent', async () => {
    await retireNaseeh.up({ db: mongoose.connection.db, apply: true });
    expect(await users().countDocuments({ groqApiKeyEnc: { $exists: true } })).toBe(0);
    expect(await users().countDocuments({ groqApiKeySetAt: { $exists: true } })).toBe(0);
    expect(await users().countDocuments({ aiEnabled: true })).toBe(0);
    expect((await users().findOne({ uid: 'c' })).name).toBe('keep');
    const again = await retireNaseeh.up({ db: mongoose.connection.db, apply: true });
    expect(again).toEqual({ keyFieldsRemoved: 0, aiTurnedOff: 0 });
  });
});
