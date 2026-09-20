import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import Donation from '../src/models/Donation.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongo;

const validDonation = (overrides = {}) => ({
  donorName: 'Test Donor',
  email: 'donor@test.dev',
  phone: '01712345678',
  paymentMethod: 'bkash',
  transactionId: `TX${Date.now()}${Math.floor(Math.random() * 1_000_000)}`,
  amount: 500,
  transactionDate: new Date().toISOString().slice(0, 10),
  ...overrides,
});

describe('Sadaqah public API', () => {
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test' });
    // Index creation (including the partial-unique transactionId index) runs
    // in the background after connect — wait for it so the duplicate-TrxID
    // test below isn't racing an index that hasn't finished building yet.
    await Donation.init();
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase().catch(() => {});
      await mongoose.disconnect().catch(() => {});
    }
    if (mongo) await mongo.stop();
  });

  test('rejects a submission missing required fields', async () => {
    const res = await request(app).post('/api/sadaqah/submit').send({});
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  test('rejects an invalid Bangladeshi phone number', async () => {
    const res = await request(app)
      .post('/api/sadaqah/submit')
      .send(validDonation({ phone: '12345' }));
    expect(res.status).toBe(400);
  });

  test('rejects an amount outside the allowed range', async () => {
    const res = await request(app)
      .post('/api/sadaqah/submit')
      .send(validDonation({ amount: 5 }));
    expect(res.status).toBe(400);
  });

  test('rejects a payment method other than bkash/nagad', async () => {
    const res = await request(app)
      .post('/api/sadaqah/submit')
      .send(validDonation({ paymentMethod: 'rocket' }));
    expect(res.status).toBe(400);
  });

  test('non-anonymous donation without a donor name is rejected', async () => {
    const { donorName, ...rest } = validDonation();
    const res = await request(app).post('/api/sadaqah/submit').send(rest);
    expect(res.status).toBe(400);
  });

  test('anonymous donation is accepted without a donor name', async () => {
    const { donorName, ...rest } = validDonation();
    const res = await request(app)
      .post('/api/sadaqah/submit')
      .send({ ...rest, isAnonymous: true });
    expect(res.status).toBe(200);
  });

  test('accepts a valid guest donation and returns a pending id', async () => {
    const res = await request(app).post('/api/sadaqah/submit').send(validDonation());
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.status).toBe('pending');
    expect(res.body.id).toBeTruthy();
  });

  test('blocks a duplicate transactionId while the original is still pending', async () => {
    const donation = validDonation();
    const first = await request(app).post('/api/sadaqah/submit').send(donation);
    expect(first.status).toBe(200);

    const second = await request(app).post('/api/sadaqah/submit').send(donation);
    expect(second.status).toBe(409);
    expect(second.body.error).toMatch(/already been submitted/i);
  });

  test('public stats carries no PII and starts at zero verified', async () => {
    const res = await request(app).get('/api/sadaqah/stats');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.totalVerifiedAmount).toBe(0);
    expect(res.body.totalVerifiedCount).toBe(0);
    expect(res.body.totalContributors).toBe(0);
    expect(Array.isArray(res.body.quarterlyBreakdown)).toBe(true);
    expect(res.body.email).toBeUndefined();
    expect(res.body.donations).toBeUndefined();
  });
});
