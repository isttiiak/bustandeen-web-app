import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../src/models/User.js';
import SalatLog from '../src/models/SalatLog.js';
import SalatDebt from '../src/models/SalatDebt.js';
import KazaUnit from '../src/models/KazaUnit.js';
import { updatePrayerStatus } from '../src/services/salat.service.js';

// Jumu'ah is not obligatory for women (Sunan Abū Dāwūd 1067, ṣaḥīḥ): a sister prays Ẓuhr
// at home or, if she chooses, Jumu'ah with the imam. Her Friday Ẓuhr used to be saved as
// "at the mosque" whatever she picked. Brothers' Friday Ẓuhr is unchanged.

let mongo;
const FRIDAY = '2026-11-27';
const THURSDAY = '2026-11-26';

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: 'ihsan_test_jumuah_sisters' });
  await Promise.all([SalatLog.init(), SalatDebt.init(), KazaUnit.init()]);
  await User.create([
    { uid: 'sister', email: 'sister@test.dev', gender: 'female' },
    { uid: 'brother', email: 'brother@test.dev', gender: 'male' },
    { uid: 'unset', email: 'unset@test.dev' },
  ]);
});
afterAll(async () => {
  await mongoose.connection.dropDatabase().catch(() => {});
  await mongoose.disconnect().catch(() => {});
  if (mongo) await mongo.stop();
});

const dhuhr = async (uid, date) =>
  (await SalatLog.findOne({ userId: uid, date }).lean())?.prayers?.dhuhr;

describe("Friday Ẓuhr for sisters (Jumu'ah is not obligatory for women)", () => {
  test('a sister’s Friday Ẓuhr keeps the place she chose', async () => {
    await updatePrayerStatus('sister', 'dhuhr', 'completed', FRIDAY, 'home');
    expect((await dhuhr('sister', FRIDAY)).location).toBe('home');
    await updatePrayerStatus('sister', 'dhuhr', 'completed', FRIDAY, 'mosque');
    expect((await dhuhr('sister', FRIDAY)).location).toBe('mosque');
    await updatePrayerStatus('sister', 'dhuhr', 'completed', FRIDAY);
    expect((await dhuhr('sister', FRIDAY)).location).toBe('home');
  });

  test('a sister’s Friday Ẓuhr made up late keeps her choice too', async () => {
    await updatePrayerStatus('sister', 'dhuhr', 'kaza', FRIDAY, 'jamat');
    expect((await dhuhr('sister', FRIDAY)).location).toBe('jamat');
  });

  test('a brother’s Friday Ẓuhr is still Jumu’ah at the mosque, and its kaza alone', async () => {
    await updatePrayerStatus('brother', 'dhuhr', 'completed', FRIDAY, 'home');
    expect((await dhuhr('brother', FRIDAY)).location).toBe('mosque');
    await updatePrayerStatus('brother', 'dhuhr', 'kaza', FRIDAY, 'mosque');
    expect((await dhuhr('brother', FRIDAY)).location).toBe('home');
  });

  test('with no gender saved, Friday behaves as before (Jumu’ah)', async () => {
    await updatePrayerStatus('unset', 'dhuhr', 'completed', FRIDAY, 'home');
    expect((await dhuhr('unset', FRIDAY)).location).toBe('mosque');
  });

  test('other days are untouched for everyone', async () => {
    for (const uid of ['sister', 'brother']) {
      await updatePrayerStatus(uid, 'dhuhr', 'completed', THURSDAY, 'home');
      expect((await dhuhr(uid, THURSDAY)).location).toBe('home');
    }
  });

  test('a record saved before this change is left as it was', async () => {
    await SalatLog.updateOne(
      { userId: 'sister', date: FRIDAY },
      { $set: { 'prayers.dhuhr.location': 'mosque', 'prayers.dhuhr.status': 'completed' } }
    );
    await updatePrayerStatus('sister', 'asr', 'completed', FRIDAY, 'home');
    expect((await dhuhr('sister', FRIDAY)).location).toBe('mosque');
  });
});
