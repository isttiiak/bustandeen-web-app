import request from 'supertest';
import mongoose from 'mongoose';
import { jest } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import PendingSignup from '../src/models/PendingSignup.js';
import { isUnverifiedPasswordAccount } from '../src/middleware/auth.js';
import {
  checkSignup,
  completeSignup,
  hashSignupToken,
  startSignup,
} from '../src/services/signup.service.js';
import { accountExistsEmail, signupLinkEmail } from '../src/services/authEmail.templates.js';

// Email-first sign-up: no Firebase account (and no User row) exists until the
// emailed link is opened and a password chosen.

let mongo;
beforeAll(async () => {
  process.env.DEV_AUTH_BYPASS = '1';
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test' });
});
afterAll(async () => {
  await mongoose.connection.dropDatabase().catch(() => {});
  await mongoose.disconnect().catch(() => {});
  if (mongo) await mongo.stop();
});
beforeEach(async () => {
  await PendingSignup.deleteMany({});
});

const linker = (existing = null) => ({
  getUserByEmail: jest.fn(async () => {
    if (!existing) throw new Error('auth/user-not-found');
    return existing;
  }),
  createUser: jest.fn(async () => ({ uid: 'new-uid' })),
});

const input = {
  firstName: 'Amina',
  lastName: 'Khan',
  email: 'New@Example.dev',
  gender: 'female',
  lang: 'en',
};

/** Starts a sign-up and returns the raw token (only its hash is stored). */
async function startAndGetToken() {
  const l = linker();
  expect(await startSignup(input, l)).toBe('link');
  const token = 'tok_' + 'x'.repeat(40);
  await PendingSignup.updateOne({}, { tokenHash: hashSignupToken(token) });
  return token;
}

describe('start', () => {
  test('a new email gets a pending row (hashed token), and no account is created', async () => {
    const l = linker();
    expect(await startSignup(input, l)).toBe('link');
    expect(l.createUser).not.toHaveBeenCalled();
    const rows = await PendingSignup.find().lean();
    expect(rows).toHaveLength(1);
    expect(rows[0].email).toBe('new@example.dev');
    expect(rows[0].tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(rows[0].expiresAt.getTime()).toBeGreaterThan(Date.now() + 55 * 60_000);
  });

  test('asking again replaces the row, so the older link stops working', async () => {
    await startSignup(input, linker());
    const first = (await PendingSignup.findOne().lean()).tokenHash;
    await startSignup(input, linker());
    const rows = await PendingSignup.find().lean();
    expect(rows).toHaveLength(1);
    expect(rows[0].tokenHash).not.toBe(first);
  });

  test('a registered email gets no pending row (it is emailed a sign-in hint instead)', async () => {
    expect(await startSignup(input, linker({ email: 'new@example.dev' }))).toBe('exists');
    expect(await PendingSignup.countDocuments()).toBe(0);
  });
});

describe('complete', () => {
  test('creates the account already verified, then the link is used up', async () => {
    const token = await startAndGetToken();
    expect(await checkSignup(token)).toEqual({ email: 'new@example.dev', firstName: 'Amina' });
    const l = linker();
    expect(await completeSignup(token, 'secret123', l)).toEqual({
      email: 'new@example.dev',
      gender: 'female',
    });
    expect(l.createUser).toHaveBeenCalledWith({
      email: 'new@example.dev',
      password: 'secret123',
      displayName: 'Amina Khan',
      emailVerified: true,
    });
    await expect(completeSignup(token, 'secret123', l)).rejects.toMatchObject({ status: 410 });
  });

  test('an expired or unknown link is refused', async () => {
    const token = await startAndGetToken();
    await PendingSignup.updateOne({}, { expiresAt: new Date(Date.now() - 1000) });
    await expect(checkSignup(token)).rejects.toMatchObject({ status: 410 });
    await expect(completeSignup('nope'.repeat(10), 'secret123', linker())).rejects.toMatchObject({
      status: 410,
    });
  });

  test('an email registered in the meantime answers 409', async () => {
    const token = await startAndGetToken();
    const l = linker();
    l.createUser.mockRejectedValueOnce(
      Object.assign(new Error('x'), { code: 'auth/email-already-exists' })
    );
    await expect(completeSignup(token, 'secret123', l)).rejects.toMatchObject({ status: 409 });
  });
});

describe('emails', () => {
  test.each(['en', 'bn'])('%s: sign-up link and account-exists copy', (lang) => {
    const link = 'https://bustandeen.com/signup/complete?token=abc';
    const mail = signupLinkEmail(lang, { name: 'Amina', email: 'a@b.dev', link });
    expect(mail.text).toContain(link);
    expect(mail.text).toMatch(lang === 'en' ? /expires within 1 hour/ : /১ ঘণ্টার মধ্যে/);
    const exists = accountExistsEmail(lang, {
      name: null,
      email: 'a@b.dev',
      link: 'https://bustandeen.com/login',
    });
    expect(exists.text).toContain('https://bustandeen.com/login');
    for (const m of [mail, exists]) expect(m.text + m.subject).not.toMatch(/—|firebaseapp/);
  });
});

describe('unverified accounts', () => {
  test('only an email/password account without a confirmed email counts', () => {
    const base = { email: 'a@b.dev', firebase: { sign_in_provider: 'password' } };
    expect(isUnverifiedPasswordAccount({ ...base, email_verified: false })).toBe(true);
    expect(isUnverifiedPasswordAccount({ ...base, email_verified: true })).toBe(false);
    expect(
      isUnverifiedPasswordAccount({
        email: 'a@b.dev',
        email_verified: false,
        firebase: { sign_in_provider: 'google.com' },
      })
    ).toBe(false);
  });
});

describe('routes', () => {
  test('start answers ok for a well-formed request (Firebase not configured in tests)', async () => {
    const res = await request(app).post('/api/auth/signup/start').send(input);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  test('start needs a gender and a valid email', async () => {
    const bad = await request(app)
      .post('/api/auth/signup/start')
      .send({ ...input, gender: undefined });
    expect(bad.status).toBe(400);
    const email = await request(app)
      .post('/api/auth/signup/start')
      .send({ ...input, email: 'nope' });
    expect(email.status).toBe(400);
  });

  test('check and complete refuse an unknown link; complete needs 6+ characters', async () => {
    const token = 'z'.repeat(43);
    const check = await request(app).post('/api/auth/signup/check').send({ token });
    expect(check.status).toBe(410);
    const short = await request(app)
      .post('/api/auth/signup/complete')
      .send({ token, password: '123' });
    expect(short.status).toBe(400);
  });
});
