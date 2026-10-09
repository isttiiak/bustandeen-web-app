import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { MongoMemoryServer } from 'mongodb-memory-server';
import SalatLogModel from '../src/models/SalatLog.js';
import KazaUnitModel from '../src/models/KazaUnit.js';
import SalatDebtModel from '../src/models/SalatDebt.js';

// T3.4 follow-up (B): Home's one-tap "Kaza" sends the same PATCH /prayer the
// Salat page sends (status 'kaza', the tracking day's date). Kaza debt only
// follows explicit 'missed' marks, so these prove the Home button keeps the
// counter, the itemized units and every other day's data exactly as they were.

const shiftDateStr = (dateStr, delta) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().substring(0, 10);
};

const fakeJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
};

let mongo;
const today = new Date().toISOString().substring(0, 10);

async function signIn(uid) {
  const token = fakeJwt({ uid, email: `${uid}@test.dev`, name: uid });
  await request(app).post('/api/auth/verify').send({ idToken: token });
  const auth = (r) => r.set('Authorization', `Bearer ${token}`);
  // Count from a few days back so every unit below is inside the period.
  await auth(
    request(app)
      .post('/api/salat/debt/reset')
      .send({ today: shiftDateStr(today, -3) })
  );
  const mark = (prayer, status, date = today) =>
    auth(request(app).patch('/api/salat/prayer').send({ date, prayer, status }));
  // Read the counter straight from the model: GET /debt would also run the
  // missed-prayer sweep over the earlier (unlogged) days of the period.
  const debt = async () => {
    const doc = await SalatDebtModel.findOne({ userId: uid }).lean();
    const owed = doc?.owed ?? {};
    const totalOwed = Object.values(owed).reduce((a, b) => a + (b ?? 0), 0);
    return { owed, totalOwed };
  };
  const units = async () =>
    (await auth(request(app).get('/api/salat/debt/units'))).body.units.map(
      (u) => `${u.prayer}@${u.missedDate}`
    );
  return { auth, mark, debt, units };
}

describe('Home Kaza button: kaza debt stays in sync', () => {
  beforeAll(async () => {
    process.env.DEV_AUTH_BYPASS = '1';
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test_home_kaza' });
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase().catch(() => {});
      await mongoose.disconnect().catch(() => {});
    }
    if (mongo) await mongo.stop();
  });

  test('same-day Kaza on a pending prayer creates no debt and no unit', async () => {
    const u = await signIn('hk1');
    const before = await u.debt();
    const res = await u.mark('dhuhr', 'kaza');
    expect(res.status).toBe(200);
    const after = await u.debt();
    expect(after.owed.dhuhr).toBe(before.owed.dhuhr ?? 0);
    expect(after.totalOwed).toBe(before.totalOwed);
    expect(await u.units()).toEqual([]);
    const log = await SalatLogModel.findOne({ userId: 'hk1', date: today });
    expect(log.prayers.dhuhr.status).toBe('kaza');
  });

  test('Miss → Kaza removes exactly that debt unit; a second tap changes nothing', async () => {
    const u = await signIn('hk2');
    await u.mark('asr', 'missed');
    expect((await u.debt()).owed.asr).toBe(1);
    expect(await u.units()).toEqual([`asr@${today}`]);

    await u.mark('asr', 'kaza');
    expect((await u.debt()).owed.asr).toBe(0);
    expect(await u.units()).toEqual([]);

    await u.mark('asr', 'kaza');
    expect((await u.debt()).owed.asr).toBe(0);
  });

  test('Kaza → Miss adds the unit back; Kaza → Done leaves the debt alone', async () => {
    const u = await signIn('hk3');
    await u.mark('fajr', 'kaza');
    await u.mark('fajr', 'missed');
    expect((await u.debt()).owed.fajr).toBe(1);
    expect(await u.units()).toEqual([`fajr@${today}`]);

    await u.mark('maghrib', 'kaza');
    await u.mark('maghrib', 'completed');
    const d = await u.debt();
    expect(d.owed.maghrib ?? 0).toBe(0);
    expect(d.owed.fajr).toBe(1);
  });

  test('Kaza on a swept-missed earlier day pays back that day only; other data untouched', async () => {
    const u = await signIn('hk4');
    const d1 = shiftDateStr(today, -2);
    const d2 = shiftDateStr(today, -1);
    for (const d of [d1, d2]) await u.mark('asr', 'missed', d);
    await u.mark('fajr', 'completed', d2);
    expect(await u.units()).toEqual([`asr@${d2}`, `asr@${d1}`]);
    const otherDay = await SalatLogModel.findOne({ userId: 'hk4', date: d1 }).lean();

    // The tracking day still open (e.g. 1 AM in fajr mode): Kaza for d2's ʿAṣr.
    await u.mark('asr', 'kaza', d2);

    expect((await u.debt()).owed.asr).toBe(1);
    expect(await u.units()).toEqual([`asr@${d1}`]);
    const d2Log = await SalatLogModel.findOne({ userId: 'hk4', date: d2 });
    expect(d2Log.prayers.asr.status).toBe('kaza');
    expect(d2Log.prayers.fajr.status).toBe('completed');
    const d1After = await SalatLogModel.findOne({ userId: 'hk4', date: d1 }).lean();
    expect(d1After.prayers).toEqual(otherDay.prayers);
    expect(await KazaUnitModel.countDocuments({ userId: 'hk4', status: 'owed' })).toBe(1);
  });
});
