import { isAvatarId } from '../utils/avatars.js';
import User from '../models/User.js';
import ZikrDaily from '../models/ZikrDaily.js';
import ZikrGoal from '../models/ZikrGoal.js';
import SalatLog from '../models/SalatLog.js';
import FastingLog from '../models/FastingLog.js';
import FastingProfile from '../models/FastingProfile.js';
import QuranLog from '../models/QuranLog.js';
import QuranProfile from '../models/QuranProfile.js';
import CycleLog from '../models/CycleLog.js';
import CycleDay from '../models/CycleDay.js';
import CycleProfile from '../models/CycleProfile.js';

/**
 * Importer for version-2 backup files (v4.9 to v5.138). New files are
 * version 3 (backup.service.ts); this stays so every file a user saved
 * before U6 still restores. Do not change its behaviour.
 *
 * Restore semantics: MERGE with imported-wins. Docs are upserted by their
 * natural key (date / date+type / startDate), so importing an old backup
 * over fresh data overwrites only the days present in the file.
 * One change since: a file no longer restores Rayhanah partner sharing.
 */

// Bumped 2 -> Rayhanah's CycleDay fields (flow/symptoms/moods/garden) moved
// behind field-level encryption (see models/CycleDay.ts). Import uses raw
// bulkWrite/replaceOne, which bypasses the Mongoose schema entirely, so a
// pre-encryption (v1) backup file is rejected rather than silently writing
// its plaintext fields straight into the collection.
export const BACKUP_V2 = 2;

type PlainDoc = Record<string, unknown>;

/** Map keys may not contain "." or start with "$" (Mongo path rules). */
const safeKey = (k: string) =>
  k.length > 0 && k.length <= 100 && !k.includes('.') && !k.startsWith('$');

// Backup files may carry legacy base64 photos taken before the Firebase Storage
// migration — allow image/jpeg|png|webp up to 300 KB for backward compatibility.
// data:text/* and other executable MIME types are rejected regardless of size.
const PHOTO_SAFE_DATA_RE = /^data:image\/(jpeg|png|webp);base64,/;
const isValidPhotoUrl = (url: unknown): url is string =>
  typeof url === 'string' &&
  (url.startsWith('https://')
    ? url.length <= 2048
    : PHOTO_SAFE_DATA_RE.test(url) && url.length <= 300 * 1024);

export interface ImportCountsV2 {
  zikrDays: number;
  salatDays: number;
  fastingDays: number;
  quranDays: number;
  cycleEntries: number;
}

export interface BackupFileV2 {
  app?: string;
  version?: number;
  user?: PlainDoc | null;
  zikr?: {
    totalCount?: number;
    zikrTotals?: Record<string, number>;
    zikrTypes?: Array<{ name: string }>;
    goal?: PlainDoc | null;
    daily?: PlainDoc[];
  };
  salat?: PlainDoc[];
  fasting?: { profile?: PlainDoc | null; logs?: PlainDoc[] };
  quran?: { profile?: PlainDoc | null; logs?: PlainDoc[] };
  cycle?: { profile?: PlainDoc | null; logs?: PlainDoc[]; days?: PlainDoc[] };
}

export async function importV2(uid: string, data: BackupFileV2): Promise<ImportCountsV2> {
  // Defense-in-depth: the controller pre-checks this, but the service must also
  // enforce it so a direct call (tests, future callers) can't bypass the guard.
  if (data.version !== BACKUP_V2) {
    const err = Object.assign(
      new Error(
        `Backup version mismatch: file is version ${data.version ?? 'unknown'}, ` +
          `expected ${BACKUP_V2}. Export a fresh backup from the current app and retry.`
      ),
      { statusCode: 400 }
    );
    throw err;
  }

  const counts: ImportCountsV2 = {
    zikrDays: 0,
    salatDays: 0,
    fastingDays: 0,
    quranDays: 0,
    cycleEntries: 0,
  };

  // ── User + zikr lifetime state ──
  const userSet: PlainDoc = {};
  if (data.user && typeof data.user === 'object') {
    const copyableFields: readonly string[] = ['displayName', 'gender', 'birthDate', 'country'];
    for (const [k, v] of Object.entries(data.user)) {
      if (copyableFields.includes(k) && v !== undefined && v !== null) {
        Object.assign(userSet, { [k]: v });
      }
    }
    // Validate photoUrl from backup — reject data:text/* and other non-image MIMEs.
    if (data.user.photoUrl !== undefined && data.user.photoUrl !== null) {
      if (isValidPhotoUrl(data.user.photoUrl)) userSet.photoUrl = data.user.photoUrl;
    }
    // Preset avatar (newer backups); unknown ids are ignored.
    if (isAvatarId(data.user.avatarId)) userSet.avatarId = data.user.avatarId;
  }
  if (data.zikr) {
    if (typeof data.zikr.totalCount === 'number' && data.zikr.totalCount >= 0)
      userSet.totalCount = data.zikr.totalCount;
    if (data.zikr.zikrTotals && typeof data.zikr.zikrTotals === 'object') {
      userSet.zikrTotals = Object.fromEntries(
        Object.entries(data.zikr.zikrTotals).filter(
          ([k, v]) => safeKey(k) && typeof v === 'number' && v >= 0
        )
      );
    }
    if (Array.isArray(data.zikr.zikrTypes)) {
      const names = [
        ...new Set(
          data.zikr.zikrTypes
            .map((t) => (typeof t?.name === 'string' ? t.name.trim() : ''))
            .filter((n) => safeKey(n))
        ),
      ].slice(0, 200);
      if (names.length) userSet.zikrTypes = names.map((name) => ({ name }));
    }
  }
  if (Object.keys(userSet).length) await User.updateOne({ uid }, { $set: userSet });

  if (data.zikr?.goal && typeof data.zikr.goal === 'object') {
    const target = Number((data.zikr.goal as PlainDoc).dailyTarget);
    if (Number.isFinite(target) && target >= 1) {
      await ZikrGoal.updateOne(
        { userId: uid },
        { $set: { dailyTarget: target, isActive: true } },
        { upsert: true }
      );
    }
  }

  // ── Per-day docs: replace-by-natural-key upserts (imported wins) ──
  if (Array.isArray(data.zikr?.daily) && data.zikr.daily.length) {
    const ops = data.zikr.daily
      .filter(
        (d) =>
          d &&
          typeof d.zikrType === 'string' &&
          safeKey(d.zikrType) &&
          d.date &&
          Number(d.count) >= 0
      )
      .slice(0, 20000)
      .map((d) => ({
        updateOne: {
          filter: { userId: uid, date: new Date(d.date as string), zikrType: d.zikrType as string },
          update: { $set: { count: Number(d.count) } },
          upsert: true,
        },
      }));
    if (ops.length) {
      await ZikrDaily.bulkWrite(ops);
      counts.zikrDays = ops.length;
    }
  }

  const replaceByDate = async (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- accepts any Mongoose model constructor, generic over the domain
    Model: any,
    docs: PlainDoc[] | undefined,
    max = 5000
  ): Promise<number> => {
    if (!Array.isArray(docs) || !docs.length) return 0;
    const ops = docs
      .filter((d) => d && typeof d.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.date))
      .slice(0, max)
      .map((d) => {
        const { _id, __v, userId, createdAt, updatedAt, ...rest } = d as PlainDoc & {
          _id?: unknown;
          __v?: unknown;
          userId?: unknown;
          createdAt?: unknown;
          updatedAt?: unknown;
        };
        return {
          replaceOne: {
            filter: { userId: uid, date: d.date },
            replacement: { ...rest, userId: uid, date: d.date },
            upsert: true,
          },
        };
      });
    if (ops.length) await Model.bulkWrite(ops);
    return ops.length;
  };

  counts.salatDays = await replaceByDate(SalatLog, data.salat);
  counts.fastingDays = await replaceByDate(FastingLog, data.fasting?.logs);
  counts.quranDays = await replaceByDate(QuranLog, data.quran?.logs);

  // ── Profiles: whole-object overwrite (sanitized) ──
  const setProfile = async (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- accepts any Mongoose model constructor, generic over the domain
    Model: any,
    profile: PlainDoc | null | undefined
  ) => {
    if (!profile || typeof profile !== 'object') return;
    const { _id, __v, userId, createdAt, updatedAt, ...rest } = profile as PlainDoc & {
      _id?: unknown;
      __v?: unknown;
      userId?: unknown;
      createdAt?: unknown;
      updatedAt?: unknown;
    };
    if (Object.keys(rest).length)
      await Model.updateOne({ userId: uid }, { $set: rest }, { upsert: true });
  };
  await setProfile(FastingProfile, data.fasting?.profile);
  await setProfile(QuranProfile, data.quran?.profile);

  // ── Rayhanah ──
  if (data.cycle) {
    // Partner sharing is never switched on by a file (v5.139.0): she turns it
    // on again herself, with the partner's consent flow.
    const cp = data.cycle.profile as PlainDoc | null | undefined;
    if (cp && typeof cp === 'object') {
      const { partnerUid, partnerSyncEnabled, ...rest } = cp;
      await setProfile(CycleProfile, rest);
    }
    if (Array.isArray(data.cycle.logs) && data.cycle.logs.length) {
      const ops = data.cycle.logs
        .filter(
          (d) =>
            d &&
            typeof d.startDate === 'string' &&
            /^\d{4}-\d{2}-\d{2}$/.test(d.startDate as string)
        )
        .slice(0, 2000)
        .map((d) => {
          const { _id, __v, userId, createdAt, updatedAt, ...rest } = d as PlainDoc & {
            _id?: unknown;
            __v?: unknown;
            userId?: unknown;
            createdAt?: unknown;
            updatedAt?: unknown;
          };
          return {
            replaceOne: {
              filter: { userId: uid, startDate: d.startDate },
              replacement: { ...rest, userId: uid, startDate: d.startDate },
              upsert: true,
            },
          };
        });
      if (ops.length) {
        await CycleLog.bulkWrite(ops as never);
        counts.cycleEntries += ops.length;
      }
    }
    counts.cycleEntries += await replaceByDate(CycleDay, data.cycle.days, 3000);
  }

  return counts;
}
