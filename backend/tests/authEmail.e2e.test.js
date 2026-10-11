import request from 'supertest';
import mongoose from 'mongoose';
import { jest } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { brandedActionLink } from '../src/utils/authActionLink.js';
import { passwordResetEmail, verifyEmailEmail } from '../src/services/authEmail.templates.js';
import { sendPasswordReset, sendVerification } from '../src/services/authEmail.service.js';

// Users' forgot-password and verification emails are sent by the app (not
// Firebase's templates), so the link opens bustandeen.com/auth/action.

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};

const FIREBASE_LINK =
  'https://ihsan-9e89b.firebaseapp.com/__/auth/action?apiKey=k&mode=resetPassword&oobCode=Ab-1_2&continueUrl=x&lang=en';

const stubLinker = (user) => ({
  getUserByEmail: jest.fn(async () => {
    if (!user) throw new Error('auth/user-not-found');
    return user;
  }),
  generatePasswordResetLink: jest.fn(async () => FIREBASE_LINK),
  generateEmailVerificationLink: jest.fn(async () =>
    FIREBASE_LINK.replace('resetPassword', 'verifyEmail')
  ),
});

describe('branded links and copy', () => {
  test('links open bustandeen.com with only the mode and the one-time code', () => {
    expect(brandedActionLink(FIREBASE_LINK, 'resetPassword')).toBe(
      'https://bustandeen.com/auth/action?mode=resetPassword&oobCode=Ab-1_2'
    );
    expect(brandedActionLink(FIREBASE_LINK, 'resetPassword', 'admin')).toBe(
      'https://bustandeen.com/auth/action?mode=resetPassword&oobCode=Ab-1_2&next=admin'
    );
  });

  test.each(['en', 'bn'])('%s emails: branded link, time limit, no em dash', (lang) => {
    const link = 'https://bustandeen.com/auth/action?mode=resetPassword&oobCode=X';
    const reset = passwordResetEmail(lang, { name: 'Amina', email: 'a@b.dev', link });
    const verify = verifyEmailEmail(lang, { name: null, email: 'a@b.dev', link });
    for (const mail of [reset, verify]) {
      expect(mail.text).toContain(link);
      expect(mail.html).toContain(
        'href="https://bustandeen.com/auth/action?mode=resetPassword&amp;oobCode=X"'
      );
      expect(mail.text + mail.subject).not.toMatch(/—|firebaseapp|ihsan/);
      expect(mail.text).toContain('Nourish Your Deen');
    }
    expect(reset.text).toMatch(lang === 'en' ? /expires within 1 hour/ : /১ ঘণ্টার মধ্যে/);
    expect(reset.text).toContain('Amina');
    expect(reset.text).toContain('a@b.dev');
  });

  test('names are escaped in the HTML', () => {
    const mail = passwordResetEmail('en', {
      name: '<b>x</b>',
      email: 'a@b.dev',
      link: 'https://bustandeen.com/',
    });
    expect(mail.html).not.toContain('<b>x</b>');
    expect(mail.html).toContain('&lt;b&gt;x&lt;/b&gt;');
  });
});

describe('sendPasswordReset', () => {
  test('an unknown or disabled email gets nothing, and no link is made', async () => {
    const none = stubLinker(null);
    expect(await sendPasswordReset('x@y.dev', 'en', none)).toBe(false);
    expect(none.generatePasswordResetLink).not.toHaveBeenCalled();
    const off = stubLinker({ email: 'x@y.dev', disabled: true, emailVerified: true });
    expect(await sendPasswordReset('x@y.dev', 'en', off)).toBe(false);
    expect(off.generatePasswordResetLink).not.toHaveBeenCalled();
  });

  test('an existing account gets a link made for its own email', async () => {
    const ok = stubLinker({
      email: 'x@y.dev',
      displayName: 'Amina K',
      disabled: false,
      emailVerified: true,
    });
    // SMTP is not configured under test, so nothing actually goes out.
    expect(await sendPasswordReset('x@y.dev', 'en', ok)).toBe(false);
    expect(ok.generatePasswordResetLink).toHaveBeenCalledWith('x@y.dev');
  });
});

describe('sendVerification', () => {
  test('an already verified account is told so instead of getting an email', async () => {
    const done = stubLinker({ email: 'x@y.dev', disabled: false, emailVerified: true });
    await expect(sendVerification('x@y.dev', 'en', done)).rejects.toMatchObject({ status: 409 });
    expect(done.generateEmailVerificationLink).not.toHaveBeenCalled();
  });

  test('an unverified account gets a link (the send itself fails without SMTP)', async () => {
    const fresh = stubLinker({ email: 'x@y.dev', disabled: false, emailVerified: false });
    await expect(sendVerification('x@y.dev', 'bn', fresh)).rejects.toMatchObject({ status: 502 });
    expect(fresh.generateEmailVerificationLink).toHaveBeenCalledWith('x@y.dev');
  });
});

describe('routes', () => {
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

  test('forgot password answers ok for any well-formed email (no account probing)', async () => {
    const res = await request(app)
      .post('/api/auth/password-reset')
      .send({ email: 'nobody@nowhere.dev', lang: 'bn' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  test('forgot password rejects a malformed email or language', async () => {
    const bad = await request(app).post('/api/auth/password-reset').send({ email: 'nope' });
    expect(bad.status).toBe(400);
    const lang = await request(app)
      .post('/api/auth/password-reset')
      .send({ email: 'a@b.dev', lang: 'fr' });
    expect(lang.status).toBe(400);
  });

  test('send-verification needs a signed-in user', async () => {
    const anon = await request(app).post('/api/auth/send-verification').send({});
    expect(anon.status).toBe(401);
    const signedIn = await request(app)
      .post('/api/auth/send-verification')
      .set('Authorization', `Bearer ${fakeJwt({ uid: 'ver-1', email: 'v@test.dev' })}`)
      .send({ lang: 'en' });
    // Firebase Admin is not configured under test.
    expect(signedIn.status).toBe(503);
  });
});
