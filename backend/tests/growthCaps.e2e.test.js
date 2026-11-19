import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../src/models/User.js';
import SocialProfile from '../src/models/SocialProfile.js';
import * as zikr from '../src/services/zikr.service.js';
import * as social from '../src/services/social.service.js';
import {
  MAX_ZIKR_TYPES,
  MAX_ZIKR_TOTAL_KEYS,
  MAX_PENDING_REQUESTS,
  MAX_BLOCKED,
} from '../src/utils/limits.js';

// Audit 2026-11-16 P1-12: lists that grew without a limit.

let mongo;
beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_growth_caps' });
  await Promise.all([User.init(), SocialProfile.init()]);
});
afterAll(async () => {
  await mongoose.connection.dropDatabase().catch(() => {});
  await mongoose.disconnect().catch(() => {});
  if (mongo) await mongo.stop();
});

let n = 0;
const uid = (p) => `${p}${++n}`;
const names = (count, prefix = 'z') => Array.from({ length: count }, (_, i) => `${prefix}${i}`);

describe('zikr types and totals', () => {
  test('the list stops at the limit with a clear error and nothing is lost', async () => {
    const u = uid('zt');
    await User.create({
      uid: u,
      email: `${u}@test.dev`,
      zikrTypes: names(MAX_ZIKR_TYPES).map((name) => ({ name })),
    });
    await expect(zikr.addZikrType(u, 'one-too-many')).rejects.toMatchObject({ statusCode: 409 });
    const user = await User.findOne({ uid: u });
    expect(user.zikrTypes).toHaveLength(MAX_ZIKR_TYPES);
    // a name already in the list is still fine
    await expect(zikr.addZikrType(u, 'Z0')).resolves.toBeTruthy();
  });

  test('removing types does not let the lifetime totals grow without end', async () => {
    const u = uid('zk');
    const totals = Object.fromEntries(names(MAX_ZIKR_TOTAL_KEYS, 'old').map((k) => [k, 1]));
    await User.create({ uid: u, email: `${u}@test.dev`, zikrTypes: [], zikrTotals: totals });
    await expect(zikr.addZikrType(u, 'brand-new')).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe('friend requests and blocks', () => {
  async function profile(userId, extra = {}) {
    return SocialProfile.create({ userId, inviteCode: `code-${userId}`, ...extra });
  }

  test('someone with a full list of waiting requests cannot be sent another', async () => {
    const owner = uid('ow');
    const sender = uid('sd');
    await profile(owner, { pendingIncoming: names(MAX_PENDING_REQUESTS, 'in') });
    await profile(sender);
    const res = await social.connectByCode(sender, `code-${owner}`);
    expect(res.ok).toBe(false);
    expect((await SocialProfile.findOne({ userId: owner })).pendingIncoming).toHaveLength(
      MAX_PENDING_REQUESTS
    );
    expect((await SocialProfile.findOne({ userId: sender })).pendingOutgoing).toEqual([]);
  });

  test('a person cannot have more than the limit of requests waiting for an answer', async () => {
    const sender = uid('sd');
    const owner = uid('ow');
    await profile(sender, { pendingOutgoing: names(MAX_PENDING_REQUESTS, 'out') });
    await profile(owner);
    const res = await social.connectByCode(sender, `code-${owner}`);
    expect(res.ok).toBe(false);
    expect((await SocialProfile.findOne({ userId: owner })).pendingIncoming).toEqual([]);
  });

  test('a normal request still goes through', async () => {
    const sender = uid('sd');
    const owner = uid('ow');
    await profile(sender);
    await profile(owner);
    const res = await social.connectByCode(sender, `code-${owner}`);
    expect(res.ok).toBe(true);
    expect((await SocialProfile.findOne({ userId: owner })).pendingIncoming).toEqual([sender]);
  });

  test('the block list stops at the limit; blocking someone already blocked is still fine', async () => {
    const me = uid('bl');
    await profile(me, { blocked: names(MAX_BLOCKED, 'b') });
    await profile('target-x');
    expect((await social.blockUser(me, 'target-x')).ok).toBe(false);
    expect((await SocialProfile.findOne({ userId: me })).blocked).toHaveLength(MAX_BLOCKED);
    expect((await social.blockUser(me, 'b0')).ok).toBe(true);
  });
});
