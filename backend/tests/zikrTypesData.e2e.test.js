import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Audit 2026-11-16 P4-5: the zikr-type code no longer uses `any`. The worship
// data around it must be exactly as before: adding builds a real subdocument,
// removing is case-insensitive and leaves every other type and every lifetime
// total alone, and saving a user with duplicate names keeps one of each.

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};

let mongo;
beforeAll(async () => {
  process.env.DEV_AUTH_BYPASS = '1';
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_zikr_types' });
});
afterAll(async () => {
  await mongoose.disconnect().catch(() => {});
  if (mongo) await mongo.stop();
});

const as = (uid) => {
  const token = fakeJwt({ uid, email: `${uid}@test.dev`, name: uid });
  const auth = { Authorization: `Bearer ${token}` };
  return {
    token,
    verify: () => request(app).post('/api/auth/verify').send({ idToken: token }),
    add: (name) => request(app).post('/api/zikr/types').set(auth).send({ name }),
    remove: (name) =>
      request(app)
        .delete(`/api/zikr/types/${encodeURIComponent(name)}`)
        .set(auth),
    increment: (zikrType, amount) =>
      request(app).post('/api/zikr/increment').set(auth).send({ zikrType, amount }),
    summary: () => request(app).get('/api/zikr/summary').set(auth),
    types: () => request(app).get('/api/zikr/types').set(auth),
  };
};

describe('zikr types keep the surrounding data intact', () => {
  it('adding a type stores a real subdocument (id, name, createdAt)', async () => {
    const u = as('zt1');
    await u.verify();
    await u.add('Ya Latif');
    const doc = await User.findOne({ uid: 'zt1' }).lean();
    const added = doc.zikrTypes.find((t) => t.name === 'Ya Latif');
    expect(added).toBeTruthy();
    expect(added._id).toBeTruthy();
    expect(added.createdAt).toBeInstanceOf(Date);
  });

  it('removing a type is case-insensitive and leaves other types and all totals alone', async () => {
    const u = as('zt2');
    await u.verify();
    await u.add('Ya Wadud');
    await u.add('Ya Salam');
    await u.increment('SubhanAllah', 3);
    await u.increment('Ya Wadud', 4);

    const before = await u.summary();
    const res = await u.remove('ya WADUD');
    expect(res.status).toBe(200);

    const names = (await u.types()).body.types.map((t) => t.name || t);
    expect(names.map((n) => n.toLowerCase())).not.toContain('ya wadud');
    expect(names).toContain('Ya Salam');

    // The lifetime totals stay, including the removed type's (only the entry is gone).
    const after = await u.summary();
    expect(after.body.totalCount).toBe(before.body.totalCount);
    expect(after.body.totalCount).toBe(7);
    const totals = Object.fromEntries(after.body.perType.map((t) => [t.zikrType, t.total]));
    expect(totals.SubhanAllah).toBe(3);
    expect(totals['Ya Wadud']).toBe(4);
  });

  it('removing a name that is not in the list changes nothing', async () => {
    const u = as('zt3');
    await u.verify();
    await u.add('Ya Karim');
    const before = (await User.findOne({ uid: 'zt3' }).lean()).zikrTypes.map((t) => String(t._id));
    const res = await u.remove('Nonexistent');
    expect(res.status).toBe(200);
    const after = (await User.findOne({ uid: 'zt3' }).lean()).zikrTypes.map((t) => String(t._id));
    expect(after).toEqual(before);
  });

  it('saving a user with duplicate names (any case, any spacing) keeps one of each', async () => {
    const u = as('zt4');
    await u.verify();
    const doc = await User.findOne({ uid: 'zt4' });
    doc.zikrTypes.push({ name: 'Ya Ghafur' }, { name: ' ya ghafur ' }, { name: 'Ya Rahim' });
    await doc.save();
    const names = (await User.findOne({ uid: 'zt4' }).lean()).zikrTypes.map((t) => t.name);
    expect(names.filter((n) => n.trim().toLowerCase() === 'ya ghafur')).toHaveLength(1);
    expect(names).toContain('Ya Rahim');
  });
});
