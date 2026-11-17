import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { randomUUID } from 'node:crypto';
import Donation from '../src/models/Donation.js';
import DonationStats from '../src/models/DonationStats.js';
import * as sadaqah from '../src/services/sadaqah.service.js';
import { purgeAccountData } from '../src/services/user.service.js';
import User from '../src/models/User.js';

// Audit 2026-11-16 P1-13: deleting a donation removed a financial record for
// good. It is now marked deleted (who, when), hidden everywhere, and its
// transaction id is freed.

let mongo;
beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_donation_soft_delete' });
  await Promise.all([Donation.init(), DonationStats.init()]);
});
afterAll(async () => {
  await mongoose.connection.dropDatabase().catch(() => {});
  await mongoose.disconnect().catch(() => {});
  if (mongo) await mongo.stop();
});

const make = (extra = {}) =>
  Donation.create({
    email: 'donor@test.dev',
    donorName: 'Donor',
    amount: 500,
    paymentMethod: 'bkash',
    phone: '01700000000',
    transactionId: `t-${randomUUID()}`,
    transactionDate: new Date('2026-03-05'),
    status: 'pending',
    ...extra,
  });
const stats = async () => DonationStats.findOne({ _id: sadaqah.STATS_ID }).lean();

describe('deleting a donation', () => {
  test('the record stays, marked with who and when, and is hidden from every read', async () => {
    const d = await make();
    await sadaqah.deleteDonation(String(d._id), 'owner@test.dev');
    const kept = await Donation.findOne({ _id: d._id }, null, { withDeleted: true });
    expect(kept).not.toBeNull();
    expect(kept.deletedBy).toBe('owner@test.dev');
    expect(kept.deletedAt).toBeInstanceOf(Date);
    expect(kept.amount).toBe(500);
    expect(await Donation.findById(d._id)).toBeNull();
    expect(await Donation.countDocuments({ _id: d._id })).toBe(0);
    expect((await Donation.find({ _id: d._id })).length).toBe(0);
    expect((await Donation.aggregate([{ $match: { _id: d._id } }])).length).toBe(0);
  });

  test('deleting a verified donation reverses the public total once, and a second delete is a 404', async () => {
    const d = await make();
    const before = await stats();
    await sadaqah.verifyDonation(String(d._id), 'owner@test.dev', 'thanks');
    const verified = await stats();
    expect(verified.totalVerifiedAmount).toBe((before?.totalVerifiedAmount ?? 0) + 500);
    await sadaqah.deleteDonation(String(d._id), 'owner@test.dev');
    const after = await stats();
    expect(after.totalVerifiedAmount).toBe(before?.totalVerifiedAmount ?? 0);
    await expect(sadaqah.deleteDonation(String(d._id), 'owner@test.dev')).rejects.toMatchObject({
      status: 404,
    });
    expect((await stats()).totalVerifiedAmount).toBe(before?.totalVerifiedAmount ?? 0);
  });

  test("its transaction id is free again, so a mistaken entry does not lock the donor's real one", async () => {
    const txn = `T-${randomUUID()}`.toUpperCase();
    const d = await make({ transactionId: txn });
    await sadaqah.deleteDonation(String(d._id), 'owner@test.dev');
    await expect(make({ transactionId: txn })).resolves.toBeTruthy();
    const kept = await Donation.findOne({ _id: d._id }, null, { withDeleted: true });
    expect(kept.deletedOriginalTransactionId).toBe(txn);
  });

  test('a deleted donation cannot be verified, reopened or counted', async () => {
    const d = await make();
    await sadaqah.deleteDonation(String(d._id), 'owner@test.dev');
    await expect(sadaqah.verifyDonation(String(d._id), 'o@test.dev', 'x')).rejects.toMatchObject({
      status: 404,
    });
    await expect(sadaqah.reopenDonation(String(d._id))).rejects.toMatchObject({ status: 404 });
  });

  test('deleting the donor account still unlinks and clears the IP of a deleted donation', async () => {
    const uid = `sd-${randomUUID()}`;
    await User.create({ uid, email: `${uid}@test.dev` });
    const d = await make({ userId: uid, ipAddress: '203.0.113.9' });
    await sadaqah.deleteDonation(String(d._id), 'owner@test.dev');
    await purgeAccountData(uid);
    const kept = await Donation.findOne({ _id: d._id }, null, { withDeleted: true }).select(
      '+ipAddress'
    );
    expect(kept.userId).toBeNull();
    expect(kept.ipAddress).toBeNull();
  });
});
