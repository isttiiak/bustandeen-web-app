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
import QuranLog from '../models/QuranLog.js';
import QuranProfile from '../models/QuranProfile.js';
import QuranReadingSession from '../models/QuranReadingSession.js';
import HifzEntry from '../models/HifzEntry.js';
import HifzLog from '../models/HifzLog.js';
import HifzProfile from '../models/HifzProfile.js';
import CycleLog from '../models/CycleLog.js';
import CycleDay from '../models/CycleDay.js';
import CycleProfile from '../models/CycleProfile.js';
import SocialProfile from '../models/SocialProfile.js';
import FeedbackMessage from '../models/FeedbackMessage.js';
import Donation from '../models/Donation.js';
import { decryptJson } from '../utils/fieldCrypto.js';

/**
 * "Download all my data" - a portability copy of everything the app holds
 * about ONE user, across every feature. Deliberately separate from
 * backup.service.ts: that file is a restorable, versioned backup of the
 * trackable domains (zikr/salat/fasting/quran/cycle) and its shape is a data
 * contract with old files. This one is broader and read-only: nothing here is
 * ever imported back, so it can add domains freely without a migration.
 *
 * Privacy rules:
 *  - Only the requesting user's own records. Other people appear at most as
 *    a count (friends), never by id, name or email.
 *  - Secrets never leave: the user's own Groq API key is reported only as
 *    "has one / added on", never the key itself; ipAddress is not exported.
 *  - Rayhanah's encrypted fields are decrypted for the owner, since a file
 *    of ciphertext is useless to the person it belongs to.
 */
export const DATA_EXPORT_VERSION = 1;

type PlainDoc = Record<string, unknown>;

/** Bounds for the two append-only logs that can grow without limit. */
const MAX_EVENTS = 50_000;

/** Strip Mongo internals and the owner's own id so the file reads cleanly. */
const clean = (doc: PlainDoc | null): PlainDoc | null => {
  if (!doc) return null;
  const { _id, __v, userId, ...rest } = doc as PlainDoc & {
    _id?: unknown;
    __v?: unknown;
    userId?: unknown;
  };
  return rest;
};
const cleanAll = (docs: unknown[]): PlainDoc[] => docs.map((d) => clean(d as PlainDoc)!);

export async function exportEverything(uid: string): Promise<PlainDoc> {
  const user = await User.findOne({ uid }).lean();
  const email = user?.email;
  // A donation belongs to the account either by sign-in at submit time or by
  // the email typed into the form (guests donate without an account).
  const donationFilter = { $or: [{ userId: uid }, ...(email ? [{ email }] : [])] };

  const [
    goal,
    streak,
    zikrDaily,
    zikrEvents,
    zikrRequests,
    salat,
    salatDebt,
    salatDebtEvents,
    kaza,
    fastingProfile,
    fastingLogs,
    quranProfile,
    quranLogs,
    quranSessions,
    hifzProfile,
    hifzEntries,
    hifzLogs,
    cycleProfile,
    cycleLogs,
    cycleDays,
    social,
    feedback,
    donations,
  ] = await Promise.all([
    ZikrGoal.findOne({ userId: uid }).lean(),
    ZikrStreak.findOne({ userId: uid }).lean(),
    ZikrDaily.find({ userId: uid }).sort({ date: 1 }).lean(),
    ZikrEvent.find({ userId: uid }).sort({ ts: -1 }).limit(MAX_EVENTS).lean(),
    ZikrRequest.find({ userId: uid }).sort({ createdAt: 1 }).lean(),
    SalatLog.find({ userId: uid }).sort({ date: 1 }).lean(),
    SalatDebt.findOne({ userId: uid }).lean(),
    SalatDebtEvent.find({ userId: uid }).sort({ date: -1 }).limit(MAX_EVENTS).lean(),
    KazaUnit.find({ userId: uid }).sort({ missedDate: 1 }).lean(),
    FastingProfile.findOne({ userId: uid }).lean(),
    FastingLog.find({ userId: uid }).sort({ date: 1 }).lean(),
    QuranProfile.findOne({ userId: uid }).lean(),
    QuranLog.find({ userId: uid }).sort({ date: 1 }).lean(),
    QuranReadingSession.find({ userId: uid }).sort({ startedAt: 1 }).lean(),
    HifzProfile.findOne({ userId: uid }).lean(),
    HifzEntry.find({ userId: uid }).sort({ surah: 1, ayah: 1 }).lean(),
    HifzLog.find({ userId: uid }).sort({ date: 1 }).lean(),
    CycleProfile.findOne({ userId: uid }).lean(),
    CycleLog.find({ userId: uid }).sort({ startDate: 1 }).lean(),
    CycleDay.find({ userId: uid }).sort({ date: 1 }).lean(),
    SocialProfile.findOne({ userId: uid }).lean(),
    FeedbackMessage.find({ userId: uid }).sort({ createdAt: 1 }).lean(),
    Donation.find(donationFilter).sort({ createdAt: 1 }).lean(),
  ]);

  const hasCycle = !!cycleProfile || cycleLogs.length > 0 || cycleDays.length > 0;
  const profile = cycleProfile as unknown as (PlainDoc & { bodyStatsEncrypted?: string }) | null;
  const { bodyStatsEncrypted, ...cycleProfileRest } = profile ?? {};

  const u = user as unknown as PlainDoc | null;

  return {
    app: 'bustandeen',
    kind: 'full-account-data-export',
    version: DATA_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    note:
      'A read-only copy of your data from every part of Bustandeen. To restore ' +
      'zikr, salat, fasting, Quran or Rayhanah data into an account, use the ' +
      'separate "Full backup" file from Settings instead.',
    account: u
      ? {
          uid,
          email: u.email ?? null,
          primaryEmail: u.primaryEmail ?? null,
          linkedProviders: ((u.linkedProviders as PlainDoc[] | undefined) ?? []).map((p) => ({
            provider: p.provider,
            email: p.email,
          })),
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
          createdAt: u.createdAt ?? null,
          lastActiveAt: u.lastActiveAt ?? null,
        }
      : null,
    preferences: u
      ? {
          hijriOffset: u.hijriOffset ?? 0,
          dayStartMode: u.dayStartMode ?? 'fajr',
          aiEnabled: u.aiEnabled ?? false,
          // Presence only. The key itself is never exported.
          ownGroqKey: u.groqApiKeyEnc
            ? { saved: true, addedOn: u.groqApiKeySetAt ?? null }
            : { saved: false },
        }
      : null,
    zikr: {
      totalCount: u?.totalCount ?? 0,
      // .lean() turns the Map into a plain object already
      totalsByType: (u?.zikrTotals as Record<string, number> | undefined) ?? {},
      myList: ((u?.zikrTypes as Array<{ name: string; createdAt?: Date }> | undefined) ?? []).map(
        (t) => ({ name: t.name, addedAt: t.createdAt ?? null })
      ),
      goal: clean(goal as unknown as PlainDoc | null),
      streak: clean(streak as unknown as PlainDoc | null),
      daily: cleanAll(zikrDaily),
      // Raw counter events are kept ~90 days by the app, so this is recent only.
      recentEvents: cleanAll(zikrEvents),
      libraryRequests: cleanAll(zikrRequests),
    },
    salat: {
      logs: cleanAll(salat),
      resetDate: u?.salatResetDate ?? null,
      resetHistory: u?.salatResetHistory ?? [],
      kazaDebt: clean(salatDebt as unknown as PlainDoc | null),
      kazaDebtEvents: cleanAll(salatDebtEvents),
      kazaUnits: cleanAll(kaza),
    },
    fasting: {
      profile: clean(fastingProfile as unknown as PlainDoc | null),
      logs: cleanAll(fastingLogs),
    },
    quran: {
      profile: clean(quranProfile as unknown as PlainDoc | null),
      logs: cleanAll(quranLogs),
      readingSessions: cleanAll(quranSessions),
    },
    hifz: {
      profile: clean(hifzProfile as unknown as PlainDoc | null),
      entries: cleanAll(hifzEntries),
      logs: cleanAll(hifzLogs),
    },
    ...(hasCycle
      ? {
          rayhanah: {
            profile: profile
              ? {
                  ...clean(cycleProfileRest),
                  bodyStats: decryptJson<unknown>(bodyStatsEncrypted) ?? null,
                }
              : null,
            cycles: cleanAll(cycleLogs),
            days: cleanAll(cycleDays).map((d) => {
              const { enc, ...rest } = d as PlainDoc & { enc?: string | null };
              return { ...rest, ...(decryptJson<PlainDoc>(enc) ?? {}) };
            }),
          },
        }
      : {}),
    friends: social
      ? {
          inviteCode: (social as unknown as PlainDoc).inviteCode ?? null,
          invisible: (social as unknown as PlainDoc).invisible ?? false,
          friendCount:
            ((social as unknown as PlainDoc).friends as unknown[] | undefined)?.length ?? 0,
          pendingIncomingCount:
            ((social as unknown as PlainDoc).pendingIncoming as unknown[] | undefined)?.length ?? 0,
          pendingOutgoingCount:
            ((social as unknown as PlainDoc).pendingOutgoing as unknown[] | undefined)?.length ?? 0,
          blockedCount:
            ((social as unknown as PlainDoc).blocked as unknown[] | undefined)?.length ?? 0,
        }
      : null,
    messagesToUs: cleanAll(feedback).map((f) => {
      const { adminNote, ...rest } = f as PlainDoc & { adminNote?: unknown };
      return rest;
    }),
    sadaqahSubmissions: cleanAll(donations).map((d) => {
      // The internal reviewer's notes and mail-threading id stay internal.
      const { rejectionReason, emailMessageId, ipAddress, ...rest } = d as PlainDoc & {
        rejectionReason?: unknown;
        emailMessageId?: unknown;
        ipAddress?: unknown;
      };
      return { ...rest, rejectionReason: rejectionReason ?? null };
    }),
  };
}
