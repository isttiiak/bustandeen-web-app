import net from 'node:net';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import CronRun from '../src/models/CronRun.js';
import { EMAIL_CHECK_MAX_AGE_MS } from '../src/services/health.service.js';

// LT-2: a daily SMTP login check per sender, and a status-page endpoint.
let mongo;
let smtp;
let accept = true;
const SECRET = 'test-cron-secret-email-0123';

/** Just enough SMTP for nodemailer's verify(): greeting, EHLO, AUTH PLAIN, QUIT. */
const startFakeSmtp = () =>
  new Promise((resolve) => {
    const server = net.createServer((sock) => {
      sock.write('220 fake.smtp ESMTP\r\n');
      sock.on('data', (buf) => {
        for (const line of buf.toString().split('\r\n').filter(Boolean)) {
          if (/^(EHLO|HELO)/i.test(line)) sock.write('250-fake.smtp\r\n250 AUTH PLAIN LOGIN\r\n');
          else if (/^AUTH PLAIN/i.test(line)) {
            const creds = Buffer.from(line.split(' ')[2] ?? '', 'base64').toString();
            const ok = accept && creds.endsWith('\u0000good-pass');
            sock.write(ok ? '235 2.7.0 Accepted\r\n' : '535 Authentication Failed\r\n');
          } else if (/^QUIT/i.test(line)) sock.end('221 Bye\r\n');
          else sock.write('250 OK\r\n');
        }
      });
      sock.on('error', () => {});
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });

describe('Email health (LT-2)', () => {
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test_email_health' });
    smtp = await startFakeSmtp();
    process.env.CRON_SECRET = SECRET;
    process.env.ZOHO_SMTP_HOST = '127.0.0.1';
    process.env.ZOHO_SMTP_PORT = String(smtp.address().port);
    process.env.ANSAR_SMTP_USER = 'ansar@test.dev';
    process.env.ANSAR_SMTP_PASS = 'good-pass';
    process.env.SADAQAH_SMTP_USER = 'sadaqah@test.dev';
    process.env.SADAQAH_SMTP_PASS = 'good-pass';
    delete process.env.ISTIAK_SMTP_USER;
    delete process.env.ISTIAK_SMTP_PASS;
  });

  beforeEach(async () => {
    accept = true;
    await CronRun.deleteMany({});
  });

  afterAll(async () => {
    smtp?.close();
    await mongoose.connection.dropDatabase().catch(() => {});
    await mongoose.disconnect().catch(() => {});
    if (mongo) await mongo.stop();
  });

  const runCheck = () =>
    request(app).get('/api/cron/email-check').set('Authorization', `Bearer ${SECRET}`);

  test('the cron route needs the cron secret', async () => {
    expect((await request(app).get('/api/cron/email-check')).status).toBe(401);
  });

  test('never run: the status endpoint is 503', async () => {
    const res = await request(app).get('/api/health/email');
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ ok: false, state: 'never-run' });
  });

  test('every configured sender logs in: ok, and the status endpoint is 200', async () => {
    const res = await runCheck();
    expect(res.status).toBe(200);
    expect(res.body.detail).toBe('ansar ok; sadaqah ok; istiak not configured');
    const health = await request(app).get('/api/health/email');
    expect(health.status).toBe(200);
    expect(health.body).toMatchObject({ ok: true, state: 'ok' });
  });

  test('a refused login fails the run, keeps the last success, and the endpoint is 503', async () => {
    await runCheck();
    accept = false;
    const res = await runCheck();
    expect(res.status).toBe(502);
    expect(res.body.detail).toContain('ansar FAILED');
    expect(res.body.detail).toContain('535');
    const run = await CronRun.findById('email-check').lean();
    expect(run.ok).toBe(false);
    expect(run.lastOkAt).toBeInstanceOf(Date);
    // No password in what is stored or shown.
    expect(JSON.stringify(run)).not.toContain('good-pass');

    const health = await request(app).get('/api/health/email');
    expect(health.status).toBe(503);
    expect(health.body.state).toBe('failed');
    // The public endpoint never says which sender or why.
    expect(JSON.stringify(health.body)).not.toMatch(/ansar|535/);
  });

  test('a check older than 36 hours is stale (the cron stopped)', async () => {
    await runCheck();
    await CronRun.updateOne(
      { _id: 'email-check' },
      { ranAt: new Date(Date.now() - EMAIL_CHECK_MAX_AGE_MS - 60_000) }
    );
    const health = await request(app).get('/api/health/email');
    expect(health.status).toBe(503);
    expect(health.body.state).toBe('stale');
  });
});
