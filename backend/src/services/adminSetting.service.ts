import AdminSetting from '../models/AdminSetting.js';

const GLOBAL_ID = 'global';
/** requireAdminAuth reads this on every admin request: a short per-instance
 *  cache keeps that off the database. Another serverless instance may see a
 *  change up to this long after it was made. */
const CACHE_MS = 15_000;

let cache: { mfaRequired: boolean; at: number } | null = null;

export const isAdminMfaRequired = async (nowMs: number = Date.now()): Promise<boolean> => {
  if (cache && nowMs - cache.at < CACHE_MS) return cache.mfaRequired;
  const doc = await AdminSetting.findById(GLOBAL_ID).lean();
  const mfaRequired = doc?.mfaRequired ?? false;
  cache = { mfaRequired, at: nowMs };
  return mfaRequired;
};

export const getAdminSettings = async () => {
  const doc = await AdminSetting.findById(GLOBAL_ID).lean();
  return {
    mfaRequired: doc?.mfaRequired ?? false,
    updatedBy: doc?.updatedBy ?? null,
    updatedAt: doc?.updatedAt ?? null,
  };
};

export const setAdminMfaRequired = async (mfaRequired: boolean, byEmail: string) => {
  await AdminSetting.updateOne(
    { _id: GLOBAL_ID },
    { $set: { mfaRequired, updatedBy: byEmail, updatedAt: new Date() } },
    { upsert: true }
  );
  cache = { mfaRequired, at: Date.now() };
  return getAdminSettings();
};

/** Tests only: forget the cached value between suites. */
export const resetAdminSettingCache = (): void => {
  cache = null;
};
