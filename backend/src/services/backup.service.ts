import type { RestorableModel } from '../utils/modelShapes.js';
import { isAvatarId } from '../utils/avatars.js';
import { decryptJson, encryptJson, fieldContexts } from '../utils/fieldCrypto.js';
import User from '../models/User.js';
import ZikrDaily from '../models/ZikrDaily.js';
import ZikrGoal from '../models/ZikrGoal.js';
import ZikrStreak from '../models/ZikrStreak.js';
import ZikrEvent from '../models/ZikrEvent.js';
import ZikrRequest from '../models/ZikrRequest.js';
import SalatLog from '../models/SalatLog.js';
import SalatDebt from '../models/SalatDebt.js';
import SalatDebtEvent from '../models/SalatDebtEvent.js';
import KazaUnit from '../models/KazaUnit.js';
import FastingLog from '../models/FastingLog.js';
import FastingProfile from '../models/FastingProfile.js';
import AdhkarDay from '../models/AdhkarDay.js';
import QuranLog from '../models/QuranLog.js';
import QuranProfile from '../models/QuranProfile.js';
import QuranReadingSession from '../models/QuranReadingSession.js';
import HifzEntry from '../models/HifzEntry.js';
import { ayahCountOf } from '../utils/surahAyahCounts.js';
import HifzLog from '../models/HifzLog.js';
import HifzProfile from '../models/HifzProfile.js';
import NaseehPlan from '../models/NaseehPlan.js';
import CycleLog from '../models/CycleLog.js';
import CycleDay from '../models/CycleDay.js';
import CycleProfile from '../models/CycleProfile.js';
import SocialProfile, { VISIBILITIES } from '../models/SocialProfile.js';
import FeedbackMessage from '../models/FeedbackMessage.js';
import Donation from '../models/Donation.js';
import { getPrefs, SYNCED_PREF_KEYS } from './userPrefs.service.js';
import { getOrCreateProfile as getOrCreateSocialProfile } from './social.service.js';
import { BACKUP_V2, importV2, type BackupFileV2 } from './backupV2.service.js';
import { PRAYER_IDS } from '../models/SalatLog.js';
import { latestPossibleToday } from '../validation/clientDay.js';
import { runInTransaction } from '../utils/transaction.js';
import { keepOneOpenCycle } from '../utils/cycleImport.js';

/**
 * Backup file, version 3 (U6, v5.139.0): ONE file with everything the app
 * holds for a person, which the import endpoint restores. It replaced both
 * the version-2 backup (which missed settings, Kaza debt, hifz, adhkār,
 * reading sessions and more) and the separate read-only "All my data" file.
 *
 * - `app: 'ihsan'` is a data contract with every backup ever saved (see
 *   CLAUDE.md, Deferred Migrations). Keep it.
 * - Every collection in purgeAccountData (user.service.ts) that holds the
 *   person's own data is here. A new per-user model must be added to both.
 * - `records` is a read-only copy of things that are not ours to restore
 *   (messages to us, sadaqah submissions, zikr requests, friend counts).
 *   Import never reads it.
 * - Rayhanah is written readable (decrypted for its owner) and encrypted
 *   again on import, so a file still restores after a key change.
 *
 * Restore semantics: MERGE with imported-wins, as before. Day docs upsert
 * by their natural key; profiles are replaced. One exception: the Kaza
 * ledger (debt, its events and units) is one running balance, so merging
 * two would double count; it is replaced as a whole when the file has it. Every doc is cast through its Mongoose schema first, so unknown
 * fields drop and bad types are skipped instead of written raw.
 */
export const BACKUP_VERSION = 3;

type PlainDoc = Record<string, unknown>;
type AnyModel = RestorableModel; // one helper serves every domain model

const OMIT = new Set(['_id', '__v', 'userId', 'createdAt', 'updatedAt']);

/** Strip Mongo internals and the owner's id so the file is portable. */
function clean(doc: unknown): PlainDoc | null {
  if (!doc || typeof doc !== 'object') return null;
  return Object.fromEntries(Object.entries(doc as PlainDoc).filter(([k]) => !OMIT.has(k)));
}
const cleanAll = (docs: unknown[]): PlainDoc[] => docs.map((d) => clean(d)!);

/** Bounds per collection, far above any real account (largest on prod at
 * U6 time: 719 zikr events, 489 zikr days). They stop a crafted file from
 * turning one request into an unbounded write. */
const MAX = {
  days: 20_000,
  events: 50_000,
  units: 20_000,
  small: 5_000,
} as const;

// ── Export ────────────────────────────────────────────────────────────────

export async function exportBackup(uid: string): Promise<PlainDoc> {
  const user = await User.findOne({ uid }).lean();
  const email = user?.email;
  // A donation belongs to the account either by sign-in at submit time or by
  // the email typed into the form (guests donate without an account).
  const donationFilter = { $or: [{ userId: uid }, ...(email ? [{ email }] : [])] };

  const [
    prefs,
    goal,
    streak,
    zikrDaily,
    zikrEvents,
    zikrRequests,
    salat,
    salatDebt,
    salatDebtEvents,
    kazaUnits,
    fastingProfile,
    fastingLogs,
    adhkarDays,
    quranProfile,
    quranLogs,
    quranSessions,
    hifzProfile,
    hifzEntries,
    hifzLogs,
    naseehPlans,
    cycleProfile,
    cycleLogs,
    cycleDays,
    social,
    feedback,
    donations,
  ] = await Promise.all([
    getPrefs(uid),
    ZikrGoal.findOne({ userId: uid }).lean(),
    ZikrStreak.findOne({ userId: uid }).lean(),
    ZikrDaily.find({ userId: uid }).sort({ date: 1, zikrType: 1 }).lean(),
    ZikrEvent.find({ userId: uid }).sort({ ts: 1 }).limit(MAX.events).lean(),
    ZikrRequest.find({ userId: uid }).sort({ createdAt: 1 }).lean(),
    SalatLog.find({ userId: uid }).sort({ date: 1 }).lean(),
    SalatDebt.findOne({ userId: uid }).lean(),
    SalatDebtEvent.find({ userId: uid })
      .sort({ date: 1, prayer: 1, delta: 1 })
      .limit(MAX.events)
      .lean(),
    KazaUnit.find({ userId: uid }).sort({ missedDate: 1, prayer: 1 }).lean(),
    FastingProfile.findOne({ userId: uid }).lean(),
    FastingLog.find({ userId: uid }).sort({ date: 1 }).lean(),
    AdhkarDay.find({ userId: uid }).sort({ date: 1 }).lean(),
    QuranProfile.findOne({ userId: uid }).lean(),
    QuranLog.find({ userId: uid }).sort({ date: 1 }).lean(),
    QuranReadingSession.find({ userId: uid }).sort({ startedAt: 1 }).lean(),
    HifzProfile.findOne({ userId: uid }).lean(),
    HifzEntry.find({ userId: uid }).sort({ surah: 1, ayah: 1 }).lean(),
    HifzLog.find({ userId: uid }).sort({ date: 1 }).lean(),
    NaseehPlan.find({ userId: uid }).sort({ weekStart: 1 }).lean(),
    CycleProfile.findOne({ userId: uid }).lean(),
    CycleLog.find({ userId: uid }).sort({ startDate: 1 }).lean(),
    CycleDay.find({ userId: uid }).sort({ date: 1 }).lean(),
    SocialProfile.findOne({ userId: uid }).lean(),
    FeedbackMessage.find({ userId: uid }).sort({ createdAt: 1 }).lean(),
    Donation.find(donationFilter).sort({ createdAt: 1 }).lean(),
  ]);

  const u = user as unknown as PlainDoc | null;
  const s = social as unknown as PlainDoc | null;
  const hasCycle = !!cycleProfile || cycleLogs.length > 0 || cycleDays.length > 0;

  return {
    app: 'ihsan',
    kind: 'bustandeen-backup',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    note:
      'Your Bustandeen backup. Restore it from Settings, Your data. The "records" part is a ' +
      'read-only copy and is never imported.',
    profile: u
      ? {
          displayName: u.displayName ?? null,
          firstName: u.firstName ?? null,
          lastName: u.lastName ?? null,
          occupation: u.occupation ?? null,
          gender: u.gender ?? null,
          birthDate: u.birthDate ?? null,
          bio: u.bio ?? null,
          city: u.city ?? null,
          country: u.country ?? null,
          photoUrl: u.photoUrl ?? null,
          avatarId: u.avatarId ?? null,
        }
      : null,
    settings: {
      dayStartMode: u?.dayStartMode ?? 'fajr',
      hijriOffset: u?.hijriOffset ?? 0,
      hijriOffsetSet: u?.hijriOffsetSet ?? false,
      aiEnabled: u?.aiEnabled ?? false,
      // Every synced app setting (calculation method, madhab, Home layout,
      // Quran display, Musafir...), as key -> stored string.
      app: Object.fromEntries(Object.entries(prefs).map(([k, e]) => [k, e.v])),
    },
    zikr: {
      totalCount: u?.totalCount ?? 0,
      // .lean() turns the Map into a plain object already
      zikrTotals: (u?.zikrTotals as Record<string, number> | undefined) ?? {},
      zikrTypes: (
        (u?.zikrTypes as Array<{ name: string; createdAt?: Date }> | undefined) ?? []
      ).map((t) => ({ name: t.name, createdAt: t.createdAt ?? null })),
      goal: clean(goal),
      streak: clean(streak),
      daily: cleanAll(zikrDaily),
      // Counter sessions; the app keeps these about 90 days.
      events: cleanAll(zikrEvents),
    },
    salat: {
      logs: cleanAll(salat),
      resetDate: u?.salatResetDate ?? null,
      resetHistory: ((u?.salatResetHistory as PlainDoc[] | undefined) ?? []).map((e) => clean(e)),
      kaza: {
        debt: clean(salatDebt),
        events: cleanAll(salatDebtEvents),
        units: cleanAll(kazaUnits),
      },
    },
    fasting: {
      profile: clean(fastingProfile),
      logs: cleanAll(fastingLogs),
    },
    adhkar: { days: cleanAll(adhkarDays) },
    quran: {
      profile: clean(quranProfile),
      logs: cleanAll(quranLogs),
      sessions: cleanAll(quranSessions),
    },
    hifz: {
      profile: clean(hifzProfile),
      entries: cleanAll(hifzEntries),
      logs: cleanAll(hifzLogs),
    },
    naseeh: { plans: cleanAll(naseehPlans) },
    // Fresh starts of zikr / fasting / quran (U7); salat's are in salat.*.
    freshStarts: (u?.statsResets as PlainDoc | undefined) ?? null,
    friends: s
      ? {
          visibility: s.visibility ?? null,
          invisible: s.invisible ?? false,
          secret: s.secret ?? {},
        }
      : null,
    ...(hasCycle ? { rayhanah: exportRayhanah(uid, cycleProfile, cycleLogs, cycleDays) } : {}),
    records: {
      account: u
        ? {
            uid,
            email: u.email ?? null,
            primaryEmail: u.primaryEmail ?? null,
            linkedProviders: ((u.linkedProviders as PlainDoc[] | undefined) ?? []).map((p) => ({
              provider: p.provider,
              email: p.email,
            })),
            createdAt: u.createdAt ?? null,
            lastActiveAt: u.lastActiveAt ?? null,
          }
        : null,
      // Other people appear only as counts, never by id, name or email.
      friendCounts: s
        ? {
            friends: (s.friends as unknown[] | undefined)?.length ?? 0,
            pendingIncoming: (s.pendingIncoming as unknown[] | undefined)?.length ?? 0,
            pendingOutgoing: (s.pendingOutgoing as unknown[] | undefined)?.length ?? 0,
            blocked: (s.blocked as unknown[] | undefined)?.length ?? 0,
          }
        : null,
      zikrLibraryRequests: cleanAll(zikrRequests),
      messagesToUs: cleanAll(feedback).map((f) => {
        const { adminNote, ipAddress, ...rest } = f;
        return rest;
      }),
      sadaqahSubmissions: cleanAll(donations).map((d) => {
        // The reviewer's notes and the mail-threading id stay internal.
        const { emailMessageId, ipAddress, ...rest } = d;
        return rest;
      }),
    },
  };
}

function exportRayhanah(
  uid: string,
  profile: unknown,
  cycles: unknown[],
  days: unknown[]
): PlainDoc {
  const p = clean(profile);
  let outProfile: PlainDoc | null = null;
  if (p) {
    // The partner's uid is another person's id, and sharing is never
    // restored from a file, so neither is written.
    const { bodyStatsEncrypted, partnerUid, partnerSyncEnabled, ...rest } = p;
    outProfile = {
      ...rest,
      bodyStats:
        decryptJson<unknown>(bodyStatsEncrypted as string, fieldContexts.bodyStats(uid)) ?? null,
    };
  }
  return {
    profile: outProfile,
    cycles: cleanAll(cycles),
    days: cleanAll(days).map((d) => {
      const { enc, ...rest } = d;
      return {
        ...rest,
        note:
          decryptJson<PlainDoc>(
            enc as string | null,
            fieldContexts.cycleDay(uid, String(d.date))
          ) ?? null,
      };
    }),
  };
}

// ── Import ────────────────────────────────────────────────────────────────

export interface ImportCounts {
  zikrDays: number;
  salatDays: number;
  fastingDays: number;
  quranDays: number;
  cycleEntries: number;
  adhkarDays?: number;
  hifzItems?: number;
  kazaUnits?: number;
  settings?: number;
  /** Rows of the file that were left out because a date, prayer or number was not usable. */
  skippedRows?: number;
}

export interface BackupFileV3 {
  app?: string;
  version?: number;
  profile?: PlainDoc | null;
  settings?: {
    dayStartMode?: unknown;
    hijriOffset?: unknown;
    hijriOffsetSet?: unknown;
    aiEnabled?: unknown;
    app?: Record<string, unknown>;
  };
  zikr?: {
    totalCount?: unknown;
    zikrTotals?: Record<string, unknown>;
    zikrTypes?: Array<{ name?: unknown; createdAt?: unknown }>;
    goal?: PlainDoc | null;
    streak?: PlainDoc | null;
    daily?: PlainDoc[];
    events?: PlainDoc[];
  };
  salat?: {
    logs?: PlainDoc[];
    resetDate?: unknown;
    resetHistory?: PlainDoc[];
    kaza?: { debt?: PlainDoc | null; events?: PlainDoc[]; units?: PlainDoc[] };
  };
  fasting?: { profile?: PlainDoc | null; logs?: PlainDoc[] };
  adhkar?: { days?: PlainDoc[] };
  quran?: { profile?: PlainDoc | null; logs?: PlainDoc[]; sessions?: PlainDoc[] };
  hifz?: { profile?: PlainDoc | null; entries?: PlainDoc[]; logs?: PlainDoc[] };
  naseeh?: { plans?: PlainDoc[] };
  freshStarts?: Record<string, unknown> | null;
  friends?: { visibility?: unknown; invisible?: unknown; secret?: Record<string, unknown> } | null;
  rayhanah?: { profile?: PlainDoc | null; cycles?: PlainDoc[]; days?: PlainDoc[] };
}

const isObj = (v: unknown): v is PlainDoc => !!v && typeof v === 'object' && !Array.isArray(v);
const list = (v: unknown, max: number): PlainDoc[] =>
  Array.isArray(v) ? v.filter(isObj).slice(0, max) : [];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** The earliest day the app can hold: nothing in a backup is older than this. */
const FIRST_DAY = '2000-01-01';

/** True for a YYYY-MM-DD that is a day on the calendar ("2026-02-30" is not). */
function isRealDay(v: unknown): v is string {
  if (typeof v !== 'string' || !DATE_RE.test(v)) return false;
  const [y, m, d] = v.split('-').map(Number);
  const t = new Date(Date.UTC(y!, m! - 1, d!));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m! - 1 && t.getUTCDate() === d;
}

/** A real day the app could have written: from 2000, and not beyond any "today" on earth. */
function usableDay(v: unknown): v is string {
  return isRealDay(v) && v >= FIRST_DAY && v <= latestPossibleToday();
}

function shiftDay(day: string, delta: number): string {
  const t = new Date(`${day}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + delta);
  return t.toISOString().substring(0, 10);
}

/** A whole number from 0 to `max`, or null. Rejects NaN, Infinity (1e999 is valid JSON), fractions, negatives. */
function wholeUpTo(v: unknown, max: number): number | null {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max ? v : null;
}
const MAX_OWED = 1_000_000; // per prayer: about 2,700 years of five-a-day
const MAX_ZIKR_TOTAL = 1e12;

/** Rows left out of this import (a usable date, prayer or number was missing). */
interface Tally {
  skipped: number;
}
function keepDays(rows: PlainDoc[], field: string, tally: Tally): PlainDoc[] {
  const kept = rows.filter((r) => usableDay(Object.entries(r).find(([k]) => k === field)?.[1]));
  tally.skipped += rows.length - kept.length;
  return kept;
}

/**
 * The Kaza counter of a file, made safe before it replaces the stored one. The
 * counters stay as the person kept them (they hold adjustments no row shows),
 * but only as whole numbers up to MAX_OWED; the dates must be real days, the
 * cursor can never be ahead of the newest possible yesterday (the sweep would
 * stop for good) and `since` never after it.
 */
function sanitiseDebt(raw: PlainDoc): PlainDoc {
  const owedIn = new Map(Object.entries(isObj(raw.owed) ? raw.owed : {}));
  const owed = Object.fromEntries(
    PRAYER_IDS.map((p) => [p, wholeUpTo(owedIn.get(p), MAX_OWED) ?? 0])
  );
  const newest = shiftDay(latestPossibleToday(), -1);
  const out: PlainDoc = { owed };
  if (usableDay(raw.since)) out.since = raw.since;
  if (usableDay(raw.lastAccrualDate)) {
    let cursor = raw.lastAccrualDate > newest ? newest : raw.lastAccrualDate;
    // The cursor is never more than a day behind the start of the period.
    if (typeof out.since === 'string' && cursor < shiftDay(out.since, -1)) {
      cursor = shiftDay(out.since, -1);
    }
    out.lastAccrualDate = cursor;
  }
  if (Array.isArray(raw.skippedRestDays)) {
    out.skippedRestDays = [...new Set(raw.skippedRestDays.filter(usableDay))].slice(0, 5_000);
  }
  if (typeof raw.restDaysSeeded === 'boolean') out.restDaysSeeded = raw.restDaysSeeded;
  return out;
}
/** Map keys may not contain "." or start with "$" (Mongo path rules). */
const safeKey = (k: string) =>
  k.length > 0 && k.length <= 100 && !k.includes('.') && !k.startsWith('$');

/** Cast one file doc through its schema for this user. Unknown fields drop,
 * defaults fill in; an invalid doc returns null and is skipped. */
async function cast(M: AnyModel, raw: PlainDoc, uid: string): Promise<PlainDoc | null> {
  const rest = Object.fromEntries(Object.entries(raw).filter(([k]) => !OMIT.has(k)));
  const doc = new M({ ...rest, userId: uid });
  try {
    await doc.validate();
  } catch {
    return null;
  }
  const obj = doc.toObject({ flattenMaps: true, versionKey: false }) as PlainDoc;
  delete obj._id;
  delete obj.createdAt;
  delete obj.updatedAt;
  return obj;
}

/** Upsert day-like docs by their natural key; the file's version wins. */
async function upsertBy(
  M: AnyModel,
  raws: PlainDoc[],
  uid: string,
  key: (d: PlainDoc) => PlainDoc,
  tally?: Tally
): Promise<number> {
  const cast_ = (await Promise.all(raws.map((r) => cast(M, r, uid)))).filter(
    (d): d is PlainDoc => !!d
  );
  if (tally) tally.skipped += raws.length - cast_.length;
  const ops = cast_.map((d) => ({
    replaceOne: { filter: { userId: uid, ...key(d) }, replacement: d, upsert: true },
  }));
  if (ops.length) await M.bulkWrite(ops as never, { ordered: false });
  return ops.length;
}

/** Replace a one-per-user profile doc with the file's. */
async function replaceOneDoc(M: AnyModel, raw: unknown, uid: string): Promise<boolean> {
  if (!isObj(raw)) return false;
  const d = await cast(M, raw, uid);
  if (!d) return false;
  await M.replaceOne({ userId: uid }, d, { upsert: true });
  return true;
}

/** Replace every doc of a collection for this user with the file's. */
async function replaceAll(
  M: AnyModel,
  raws: PlainDoc[],
  uid: string,
  tally?: Tally
): Promise<number> {
  const docs = (await Promise.all(raws.map((r) => cast(M, r, uid)))).filter(
    (d): d is PlainDoc => !!d
  );
  if (tally) tally.skipped += raws.length - docs.length;
  await M.deleteMany({ userId: uid });
  if (docs.length) await M.insertMany(docs, { ordered: false });
  return docs.length;
}

const PROFILE_FIELDS = [
  'displayName',
  'firstName',
  'lastName',
  'occupation',
  'gender',
  'birthDate',
  'bio',
  'city',
  'country',
];
const SECRET_AREAS = new Set(['salat', 'zikr', 'quran', 'fasting']);

const isPhotoUrl = (url: unknown): url is string =>
  typeof url === 'string' &&
  (url.startsWith('https://')
    ? url.length <= 2048
    : /^data:image\/(jpeg|png|webp);base64,/.test(url) && url.length <= 300 * 1024);

async function importUser(uid: string, data: BackupFileV3): Promise<number> {
  const set: PlainDoc = {};
  const p = data.profile;
  if (isObj(p)) {
    const fields = new Set(PROFILE_FIELDS);
    for (const [k, v] of Object.entries(p)) {
      if (fields.has(k) && v !== undefined && v !== null) Object.assign(set, { [k]: v });
    }
    if (isPhotoUrl(p.photoUrl)) set.photoUrl = p.photoUrl;
    if (isAvatarId(p.avatarId)) set.avatarId = p.avatarId;
  }

  const st = data.settings;
  if (isObj(st)) {
    if (['fajr', 'midnight', 'maghrib'].includes(st.dayStartMode as string))
      set.dayStartMode = st.dayStartMode;
    if (Number.isInteger(st.hijriOffset) && Math.abs(st.hijriOffset as number) <= 2)
      set.hijriOffset = st.hijriOffset;
    if (typeof st.hijriOffsetSet === 'boolean') set.hijriOffsetSet = st.hijriOffsetSet;
    if (typeof st.aiEnabled === 'boolean') set.aiEnabled = st.aiEnabled;
  }

  const s = data.salat;
  if (isObj(s)) {
    if (usableDay(s.resetDate)) set.salatResetDate = s.resetDate;
    if (Array.isArray(s.resetHistory)) {
      set.salatResetHistory = list(s.resetHistory, 500)
        .filter((e) => usableDay(e.date))
        .map((e) => ({
          date: e.date,
          note: typeof e.note === 'string' ? e.note.slice(0, 500) : '',
          resetAt: e.resetAt ? new Date(e.resetAt as string) : new Date(),
          ...(e.all === true ? { all: true } : {}),
        }));
    }
  }

  const z = data.zikr;
  if (isObj(z)) {
    const total = wholeUpTo(z.totalCount, MAX_ZIKR_TOTAL);
    if (total !== null) set.totalCount = total;
    if (isObj(z.zikrTotals)) {
      set.zikrTotals = Object.fromEntries(
        Object.entries(z.zikrTotals).filter(
          ([k, v]) => safeKey(k) && wholeUpTo(v, MAX_ZIKR_TOTAL) !== null
        )
      );
    }
    if (Array.isArray(z.zikrTypes)) {
      const seen = new Set<string>();
      const types: PlainDoc[] = [];
      for (const t of z.zikrTypes.slice(0, 200)) {
        const name = isObj(t) && typeof t.name === 'string' ? t.name.trim() : '';
        if (!safeKey(name) || seen.has(name.toLowerCase())) continue;
        seen.add(name.toLowerCase());
        const at = isObj(t) && t.createdAt ? new Date(t.createdAt as string) : new Date();
        types.push({ name, createdAt: Number.isNaN(at.getTime()) ? new Date() : at });
      }
      if (types.length) set.zikrTypes = types;
    }
  }

  const fresh = importFreshStarts(data.freshStarts);
  if (fresh) set.statsResets = fresh;

  // App settings: stamped "now" so the restored values win on every device
  // (prefsSync is newest-wins per key).
  let settingsCount = 0;
  const app = isObj(st) && isObj(st.app) ? st.app : null;
  if (app) {
    const t = Date.now();
    for (const [k, v] of Object.entries(app)) {
      if (!SYNCED_PREF_KEYS.has(k) || typeof v !== 'string' || v.length > 4000) continue;
      set[`prefs.${k}`] = { v, t };
      settingsCount++;
    }
  }

  if (Object.keys(set).length)
    await User.updateOne({ uid }, { $set: set }, { runValidators: true });
  return settingsCount;
}

/** Fresh-start entries (U7): kept only when well formed. */
function importFreshStarts(raw: unknown): PlainDoc | null {
  if (!isObj(raw)) return null;
  const out: PlainDoc = {};
  for (const [area, entries] of Object.entries(raw)) {
    if (!FRESH_AREAS.has(area) || !Array.isArray(entries)) continue;
    const list = entries
      .filter(isObj)
      .slice(0, 500)
      .filter((e) => usableDay(e.date))
      .map((e) => ({
        date: e.date,
        note: typeof e.note === 'string' ? e.note.slice(0, 200) : '',
        resetAt: e.resetAt ? new Date(e.resetAt as string) : new Date(),
        ...(isObj(e.prevStreak) ? { prevStreak: e.prevStreak } : {}),
        ...(e.all === true ? { all: true } : {}),
        ...(typeof e.owedBefore === 'number' && e.owedBefore >= 0
          ? { owedBefore: Math.round(e.owedBefore) }
          : {}),
        ...(isObj(e.surahBaseline)
          ? {
              surahBaseline: Object.fromEntries(
                Object.entries(e.surahBaseline).filter(
                  ([k, v]) => /^\d{1,3}$/.test(k) && typeof v === 'number' && v >= 0
                )
              ),
            }
          : {}),
      }));
    Object.assign(out, { [area]: list });
  }
  return Object.keys(out).length ? out : null;
}
const FRESH_AREAS = new Set(['zikr', 'fasting', 'quran', 'kaza']);

async function importRayhanah(
  uid: string,
  r: BackupFileV3['rayhanah'],
  tally: Tally
): Promise<number> {
  if (!isObj(r)) return 0;
  if (isObj(r.profile)) {
    const { bodyStats, partnerUid, partnerSyncEnabled, ...rest } = r.profile;
    const d = await cast(
      CycleProfile,
      {
        ...rest,
        ...(isObj(bodyStats)
          ? { bodyStatsEncrypted: encryptJson(bodyStats, fieldContexts.bodyStats(uid)) }
          : {}),
      },
      uid
    );
    // $set, not replace: partner sharing stays as it is on this account.
    if (d) {
      delete d.partnerSyncEnabled;
      delete d.partnerUid;
      await CycleProfile.updateOne({ userId: uid }, { $set: d }, { upsert: true });
    }
  }
  const oneOpen = keepOneOpenCycle(keepDays(list(r.cycles, MAX.small), 'startDate', tally));
  tally.skipped += oneOpen.dropped;
  const cycleRows = oneOpen.kept;
  let n = await upsertBy(CycleLog, cycleRows, uid, (d) => ({ startDate: d.startDate }), tally);
  const days = keepDays(list(r.days, MAX.small), 'date', tally).map((d) => ({
    date: d.date,
    enc: isObj(d.note) ? encryptJson(d.note, fieldContexts.cycleDay(uid, String(d.date))) : null,
  }));
  n += await upsertBy(CycleDay, days, uid, (d) => ({ date: d.date }), tally);
  return n;
}

async function importV3(uid: string, data: BackupFileV3): Promise<ImportCounts> {
  const counts: ImportCounts = {
    zikrDays: 0,
    salatDays: 0,
    fastingDays: 0,
    quranDays: 0,
    cycleEntries: 0,
    adhkarDays: 0,
    hifzItems: 0,
    kazaUnits: 0,
    settings: 0,
  };

  const tally: Tally = { skipped: 0 };
  counts.settings = await importUser(uid, data);

  const z = data.zikr;
  if (isObj(z)) {
    await replaceOneDoc(ZikrGoal, z.goal, uid);
    await replaceOneDoc(ZikrStreak, z.streak, uid);
    counts.zikrDays = await upsertBy(
      ZikrDaily,
      list(z.daily, MAX.days).filter((d) => typeof d.zikrType === 'string' && safeKey(d.zikrType)),
      uid,
      (d) => ({ date: d.date, zikrType: d.zikrType }),
      tally
    );
    await upsertBy(
      ZikrEvent,
      list(z.events, MAX.events),
      uid,
      (d) => ({
        ts: d.ts,
        zikrType: d.zikrType,
      }),
      tally
    );
  }

  const s = data.salat;
  if (isObj(s)) {
    counts.salatDays = await upsertBy(
      SalatLog,
      keepDays(list(s.logs, MAX.days), 'date', tally),
      uid,
      (d) => ({ date: d.date }),
      tally
    );
    // The Kaza ledger is one running balance: merging two would double count.
    // Everything is checked first; the transaction around the whole import
    // puts the old ledger back if any later step fails.
    if (isObj(s.kaza)) {
      if (isObj(s.kaza.debt)) await replaceOneDoc(SalatDebt, sanitiseDebt(s.kaza.debt), uid);
      else await SalatDebt.deleteOne({ userId: uid });
      const events = keepDays(list(s.kaza.events, MAX.events), 'date', tally).filter((e) => {
        const okEvent =
          (PRAYER_IDS as readonly string[]).includes(e.prayer as string) &&
          Number.isInteger(e.delta) &&
          Math.abs(e.delta as number) <= MAX_OWED;
        if (!okEvent) tally.skipped++;
        return okEvent;
      });
      await replaceAll(SalatDebtEvent, events, uid, tally);
      const seen = new Set<string>();
      const units = keepDays(list(s.kaza.units, MAX.units), 'missedDate', tally).filter((u) => {
        const key = `${String(u.prayer)}:${String(u.missedDate)}`;
        const ok = (PRAYER_IDS as readonly string[]).includes(u.prayer as string) && !seen.has(key);
        seen.add(key);
        if (!ok) tally.skipped++;
        return ok;
      });
      counts.kazaUnits = await replaceAll(KazaUnit, units, uid, tally);
    }
  }

  const f = data.fasting;
  if (isObj(f)) {
    await replaceOneDoc(FastingProfile, f.profile, uid);
    counts.fastingDays = await upsertBy(
      FastingLog,
      keepDays(list(f.logs, MAX.days), 'date', tally),
      uid,
      (d) => ({ date: d.date }),
      tally
    );
  }

  if (isObj(data.adhkar)) {
    counts.adhkarDays = await upsertBy(
      AdhkarDay,
      keepDays(list(data.adhkar.days, MAX.days), 'date', tally),
      uid,
      (d) => ({ date: d.date }),
      tally
    );
  }

  const q = data.quran;
  if (isObj(q)) {
    await replaceOneDoc(QuranProfile, q.profile, uid);
    counts.quranDays = await upsertBy(
      QuranLog,
      keepDays(list(q.logs, MAX.days), 'date', tally),
      uid,
      (d) => ({ date: d.date }),
      tally
    );
    await upsertBy(
      QuranReadingSession,
      list(q.sessions, MAX.events),
      uid,
      (d) => ({ clientSessionId: d.clientSessionId }),
      tally
    );
  }

  const h = data.hifz;
  if (isObj(h)) {
    await replaceOneDoc(HifzProfile, h.profile, uid);
    // Only ayat that exist and a real due date: a file cannot put 1:99 or "abc" in the list.
    const realEntries = list(h.entries, MAX.units).filter(
      (e) =>
        Number.isInteger(e.surah) &&
        Number.isInteger(e.ayah) &&
        (e.ayah as number) >= 1 &&
        (e.ayah as number) <= ayahCountOf(e.surah as number) &&
        typeof e.dueDate === 'string' &&
        DATE_RE.test(e.dueDate)
    );
    counts.hifzItems = await upsertBy(HifzEntry, realEntries, uid, (d) => ({
      surah: d.surah,
      ayah: d.ayah,
    }));
    await upsertBy(
      HifzLog,
      keepDays(list(h.logs, MAX.days), 'date', tally),
      uid,
      (d) => ({ date: d.date }),
      tally
    );
  }

  if (isObj(data.naseeh)) {
    await upsertBy(
      NaseehPlan,
      keepDays(list(data.naseeh.plans, MAX.small), 'weekStart', tally),
      uid,
      (d) => ({ weekStart: d.weekStart }),
      tally
    );
  }

  // Friends: only this person's own privacy choices. Friend lists involve
  // other people and are never restored from a file.
  const fr = data.friends;
  if (isObj(fr)) {
    await getOrCreateSocialProfile(uid);
    const set: PlainDoc = {};
    if ((VISIBILITIES as readonly string[]).includes(fr.visibility as string))
      set.visibility = fr.visibility;
    if (typeof fr.invisible === 'boolean') set.invisible = fr.invisible;
    if (isObj(fr.secret)) {
      for (const [k, v] of Object.entries(fr.secret)) {
        if (SECRET_AREAS.has(k) && typeof v === 'boolean')
          Object.assign(set, { [`secret.${k}`]: v });
      }
    }
    if (Object.keys(set).length) await SocialProfile.updateOne({ userId: uid }, { $set: set });
  }

  counts.cycleEntries = await importRayhanah(uid, data.rayhanah, tally);
  counts.skippedRows = tally.skipped;
  return counts;
}

/** Restore a backup file of version 2 or 3 into this account. */
export async function importBackup(
  uid: string,
  data: (BackupFileV3 | BackupFileV2) & { version?: number }
): Promise<ImportCounts> {
  // One transaction for the whole restore (audit P1-7): a failure part-way puts
  // the person's data back exactly as it was, instead of leaving the Kaza
  // ledger half replaced. A conflict with a concurrent request reruns it.
  if (data.version === BACKUP_V2)
    return runInTransaction(() => importV2(uid, data as BackupFileV2));
  if (data.version === BACKUP_VERSION)
    return runInTransaction(() => importV3(uid, data as BackupFileV3));
  throw Object.assign(
    new Error(
      `Backup version mismatch: file is version ${data.version ?? 'unknown'}, ` +
        `expected ${BACKUP_V2} or ${BACKUP_VERSION}. Export a fresh backup from the current app and retry.`
    ),
    { statusCode: 400 }
  );
}

export const SUPPORTED_BACKUP_VERSIONS: readonly number[] = [BACKUP_V2, BACKUP_VERSION];
