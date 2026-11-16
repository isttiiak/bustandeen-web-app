import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../src/models/User.js';
import SalatLog from '../src/models/SalatLog.js';
import Donation from '../src/models/Donation.js';
import CycleProfile from '../src/models/CycleProfile.js';
import PendingSignup from '../src/models/PendingSignup.js';
import { purgeAccountData } from '../src/services/user.service.js';

// Audit 2026-11-16 P1-11: deleting an account left a donor's IP address, a
// partner link on someone else's profile and a pending sign-up behind, and the
// login record could be deleted before the rest of the data was.

let mongo;
beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_account_deletion' });
});
afterAll(async () => {
  await mongoose.connection.dropDatabase().catch(() => {});
  await mongoose.disconnect().catch(() => {});
  if (mongo) await mongo.stop();
});
afterEach(() => jest.restoreAllMocks());

const donation = (userId) =>
  Donation.create({
    userId,
    email: 'donor@test.dev',
    name: 'Donor',
    amount: 500,
    paymentMethod: 'bkash',
    phone: '01700000000',
    transactionId: `t-${Math.random()}`,
    transactionDate: new Date('2026-03-05'),
    status: 'verified',
    ipAddress: '203.0.113.7',
  });
const ip = async (id) => (await Donation.findById(id).select('+ipAddress')).ipAddress;

describe('deleting an account', () => {
  test('a donation is kept for accountability, unlinked, and the stored IP address is cleared', async () => {
    const uid = 'del-1';
    await User.create({ uid, email: 'del1@test.dev' });
    const d = await donation(uid);
    await purgeAccountData(uid);
    const kept = await Donation.findById(d._id);
    expect(kept.userId).toBeNull();
    expect(kept.amount).toBe(500); // the record itself stays, as /privacy says
    expect(kept.email).toBe('donor@test.dev'); // "the details you entered on the form"
    expect(await ip(d._id)).toBeNull();
  });

  test("another person's partner link to the deleted account is removed", async () => {
    const uid = 'del-2';
    await User.create({ uid, email: 'del2@test.dev' });
    await CycleProfile.create({
      userId: 'partner-of-del-2',
      partnerUid: uid,
      partnerSyncEnabled: true,
    });
    await CycleProfile.create({
      userId: 'unrelated',
      partnerUid: 'someone-else',
      partnerSyncEnabled: true,
    });
    await purgeAccountData(uid);
    const p = await CycleProfile.findOne({ userId: 'partner-of-del-2' });
    expect(p.partnerUid).toBeUndefined();
    expect(p.partnerSyncEnabled).toBe(false);
    const other = await CycleProfile.findOne({ userId: 'unrelated' });
    expect(other.partnerUid).toBe('someone-else');
    expect(other.partnerSyncEnabled).toBe(true);
  });

  test('a sign-up still waiting for its confirmation link, for the same email, is removed', async () => {
    const uid = 'del-3';
    await User.create({ uid, email: 'Del3@Test.dev' });
    await PendingSignup.create({
      email: 'del3@test.dev',
      tokenHash: 'x'.repeat(64),
      gender: 'female',
      expiresAt: new Date(Date.now() + 3600_000),
    });
    await PendingSignup.create({
      email: 'someone@else.dev',
      tokenHash: 'y'.repeat(64),
      gender: 'male',
      expiresAt: new Date(Date.now() + 3600_000),
    });
    await purgeAccountData(uid);
    expect(await PendingSignup.countDocuments({ email: 'del3@test.dev' })).toBe(0);
    expect(await PendingSignup.countDocuments({ email: 'someone@else.dev' })).toBe(1);
  });

  test('if part of the purge fails the account is still there, so deleting again finishes the job', async () => {
    const uid = 'del-4';
    await User.create({ uid, email: 'del4@test.dev' });
    await SalatLog.create({ userId: uid, date: '2026-03-01' });
    jest.spyOn(SalatLog, 'deleteMany').mockRejectedValueOnce(new Error('boom'));
    await expect(purgeAccountData(uid)).rejects.toThrow('boom');
    expect(await User.countDocuments({ uid })).toBe(1);
    jest.restoreAllMocks();
    await purgeAccountData(uid);
    expect(await User.countDocuments({ uid })).toBe(0);
    expect(await SalatLog.countDocuments({ userId: uid })).toBe(0);
  });
});
