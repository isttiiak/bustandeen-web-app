import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import FeedbackMessage from '../src/models/FeedbackMessage.js';

// "Request a language" from the static pages' globe menu (2026-10-15).
let mongo;

describe('Language requests', () => {
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test_language_request' });
  });
  beforeEach(() => FeedbackMessage.deleteMany({}));
  afterAll(async () => {
    await mongoose.connection.dropDatabase().catch(() => {});
    await mongoose.disconnect().catch(() => {});
    if (mongo) await mongo.stop();
  });

  test('lands in the Feedback inbox as a "Language request", with no email', async () => {
    const res = await request(app).post('/api/feedback/language').send({ language: '  Urdu ' });
    expect(res.status).toBe(200);
    const docs = await FeedbackMessage.find().lean();
    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({
      message: 'Language request: Urdu',
      category: ['Language request'],
      kind: 'feedback',
      email: '',
      status: 'open',
    });
  });

  test('needs a language name of 2 to 60 characters', async () => {
    expect((await request(app).post('/api/feedback/language').send({ language: 'U' })).status).toBe(
      400
    );
    expect(
      (
        await request(app)
          .post('/api/feedback/language')
          .send({ language: 'x'.repeat(61) })
      ).status
    ).toBe(400);
    expect((await request(app).post('/api/feedback/language').send({})).status).toBe(400);
    expect(await FeedbackMessage.countDocuments()).toBe(0);
  });

  test('a filled honeypot is accepted silently and stores nothing', async () => {
    const res = await request(app)
      .post('/api/feedback/language')
      .send({ language: 'Urdu', botcheck: 'spam' });
    expect(res.status).toBe(200);
    expect(await FeedbackMessage.countDocuments()).toBe(0);
  });

  test('the feedback form itself still requires an email', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .send({
        name: 'A',
        message: 'A message long enough',
        category: ['Other'],
        kind: 'feedback',
      });
    expect(res.status).toBe(400);
  });
});
