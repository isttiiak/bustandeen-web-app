import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import FeedbackMessage from '../src/models/FeedbackMessage.js';

// "Request your country's calendar" from the Islamic calendar (2026-10-16).
let mongo;

describe('Calendar requests', () => {
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test_calendar_request' });
  });
  beforeEach(() => FeedbackMessage.deleteMany({}));
  afterAll(async () => {
    await mongoose.connection.dropDatabase().catch(() => {});
    await mongoose.disconnect().catch(() => {});
    if (mongo) await mongo.stop();
  });

  test('lands in the Feedback inbox as a "Calendar request" with the country, no email', async () => {
    const res = await request(app).post('/api/feedback/calendar').send({ country: ' pk ' });
    expect(res.status).toBe(200);
    const docs = await FeedbackMessage.find().lean();
    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({
      message: 'Calendar request: Pakistan (PK), government holidays and national days',
      category: ['Calendar request'],
      kind: 'feedback',
      email: '',
      status: 'open',
    });
  });

  test('needs a two-letter country code', async () => {
    for (const body of [{}, { country: 'P' }, { country: 'PAK' }, { country: '12' }]) {
      expect((await request(app).post('/api/feedback/calendar').send(body)).status).toBe(400);
    }
    expect(await FeedbackMessage.countDocuments()).toBe(0);
  });

  test('a filled honeypot is accepted silently and stores nothing', async () => {
    const res = await request(app)
      .post('/api/feedback/calendar')
      .send({ country: 'PK', botcheck: 'spam' });
    expect(res.status).toBe(200);
    expect(await FeedbackMessage.countDocuments()).toBe(0);
  });
});
