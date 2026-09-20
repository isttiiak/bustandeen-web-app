import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import Donation from '../src/models/Donation.js';
import AdminAccount from '../src/models/AdminAccount.js';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { signReceipt } from '../src/services/sadaqahReceipt.service.js';

const ADMIN_EMAIL = 'receipt-admin@test.dev';

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};

let mongo;
let adminToken;

const makeVerified = async (overrides = {}) =>
  Donation.create({
    donorName: 'Receipt Donor',
    email: 'receipt-donor@test.dev',
    phone: '01712345678',
    paymentMethod: 'bkash',
    transactionId: `RX${Date.now()}${Math.floor(Math.random() * 1_000_000)}`,
    amount: 750,
    transactionDate: new Date('2026-09-10'),
    status: 'verified',
    verifiedAt: new Date('2026-09-12T05:00:00Z'),
    verifiedBy: ADMIN_EMAIL,
    ...overrides,
  });

const sigFor = (d) =>
  signReceipt({
    id: d._id.toString(),
    amount: d.amount,
    transactionId: d.transactionId,
    verifiedAt: d.verifiedAt,
  });

describe('Signed sadaqah receipt', () => {
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_receipt_test' });
    await Donation.init();
    await AdminAccount.create({
      firebaseUid: 'receipt-admin-uid',
      email: ADMIN_EMAIL,
      role: 'servant',
      createdBy: 'test-seed',
    });
    adminToken = fakeJwt({ uid: 'receipt-admin-uid', email: ADMIN_EMAIL });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  test('admin can download a receipt as a real PDF for a verified donation', async () => {
    const d = await makeVerified();
    const res = await request(app)
      .get(`/api/admin/sadaqah/${d._id}/receipt`)
      .set('X-Admin-Token', adminToken)
      .buffer(true)
      .parse((r, cb) => {
        const chunks = [];
        r.on('data', (c) => chunks.push(c));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/pdf/);
    expect(res.headers['content-disposition']).toMatch(/Bustandeen-Sadaqah-Receipt-/);
    expect(res.body.subarray(0, 5).toString()).toBe('%PDF-');
    expect(res.body.length).toBeGreaterThan(5000);
  });

  test('a receipt is refused for a donation that is not verified', async () => {
    const d = await makeVerified({ status: 'pending', verifiedAt: null });
    const res = await request(app)
      .get(`/api/admin/sadaqah/${d._id}/receipt`)
      .set('X-Admin-Token', adminToken);
    expect(res.status).toBe(409);
  });

  test('public check confirms a genuine signature and reveals only headline facts', async () => {
    const d = await makeVerified();
    const res = await request(app)
      .get(`/api/sadaqah/verify/${d._id}`)
      .query({ s: sigFor(d) });
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.amount).toBe(750);
    expect(res.body.receiptNo).toBe(d._id.toString().slice(-6).toUpperCase());
    expect(JSON.stringify(res.body)).not.toContain(d.transactionId);
    expect(JSON.stringify(res.body)).not.toContain('Receipt Donor');
  });

  test('a wrong signature, a tampered amount and an unknown id all read as invalid', async () => {
    const d = await makeVerified();
    const good = sigFor(d);

    const wrong = await request(app).get(`/api/sadaqah/verify/${d._id}`).query({ s: 'nope' });
    expect(wrong.body.valid).toBe(false);

    const missing = await request(app).get(`/api/sadaqah/verify/${d._id}`);
    expect(missing.body.valid).toBe(false);

    // Same signature after the amount is edited in the database.
    await Donation.updateOne({ _id: d._id }, { $set: { amount: 9999 } });
    const tampered = await request(app).get(`/api/sadaqah/verify/${d._id}`).query({ s: good });
    expect(tampered.body.valid).toBe(false);

    const unknown = await request(app)
      .get(`/api/sadaqah/verify/${new mongoose.Types.ObjectId()}`)
      .query({ s: good });
    expect(unknown.body.valid).toBe(false);

    const malformed = await request(app).get('/api/sadaqah/verify/not-an-id').query({ s: good });
    expect(malformed.body.valid).toBe(false);
  });

  test('a pending donation never verifies, even with a correctly computed signature', async () => {
    const d = await makeVerified({ status: 'pending' });
    const res = await request(app)
      .get(`/api/sadaqah/verify/${d._id}`)
      .query({ s: sigFor(d) });
    expect(res.body.valid).toBe(false);
  });
});
