import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../src/models/User.js';
import ZikrDaily from '../src/models/ZikrDaily.js';
import ClientOp from '../src/models/ClientOp.js';
import SocialProfile from '../src/models/SocialProfile.js';
import ZikrRequest from '../src/models/ZikrRequest.js';
import UpdateEmailCampaign from '../src/models/UpdateEmailCampaign.js';
import { findOrphans } from '../src/scripts/lib/orphanAccounts.js';
import { DELETED_ACCOUNT_ID, purgeAccountData } from '../src/services/user.service.js';

// Raw inserts: the test is about which uids are found, not model validation.
const insert = (model, doc) => model.collection.insertOne(doc);

let mongo;

describe('orphan account cleanup', () => {
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test' });
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase().catch(() => {});
    await mongoose.disconnect().catch(() => {});
    await mongo?.stop();
  });

  beforeEach(async () => {
    await mongoose.connection.dropDatabase();
    await insert(User, { uid: 'live', email: 'live@example.com' });
    await insert(ZikrDaily, { userId: 'live', date: '2026-10-01', counts: {} });
    await insert(ZikrDaily, { userId: 'gone', date: '2026-10-01', counts: {} });
    await insert(ClientOp, { uid: 'gone', opId: 'op-1' });
    await insert(SocialProfile, { userId: 'live', friends: ['gone', 'live2'] });
    await insert(ZikrRequest, { userId: DELETED_ACCOUNT_ID, name: 'x' });
    await insert(UpdateEmailCampaign, {
      subject: 's',
      recipients: [{ uid: 'custom:a@example.com', email: 'a@example.com', group: 'custom' }],
    });
  });

  it('finds uids with no User row, ignoring placeholders', async () => {
    const report = await findOrphans();
    expect(report.uids).toEqual(['gone', 'live2']);
    const counts = Object.fromEntries(report.counts.map((c) => [c.label, c.docs]));
    expect(counts.ZikrDaily).toBe(1);
    expect(counts.ClientOp).toBe(1);
    expect(counts['SocialProfile.friends']).toBe(1);
    expect(counts.ZikrRequest).toBe(0);
    expect(counts['UpdateEmailCampaign.recipients']).toBe(0);
  });

  it('purging an orphan leaves the live account untouched', async () => {
    await purgeAccountData('gone');
    await purgeAccountData('live2');
    expect((await findOrphans()).uids).toEqual([]);
    expect(await ZikrDaily.countDocuments({ userId: 'live' })).toBe(1);
    expect(await User.countDocuments({ uid: 'live' })).toBe(1);
    const profile = await SocialProfile.findOne({ userId: 'live' }).lean();
    expect(profile.friends).toEqual([]);
  });
});
