import SocialProfile, {
  generateInviteCode,
  ISocialProfile,
  MAX_FRIENDS,
} from '../models/SocialProfile.js';
import User from '../models/User.js';
import SalatLog, { PRAYER_IDS } from '../models/SalatLog.js';
import FastingLog from '../models/FastingLog.js';
import QuranLog from '../models/QuranLog.js';
import QuranProfile from '../models/QuranProfile.js';
import ZikrGoal from '../models/ZikrGoal.js';
import ZikrDaily from '../models/ZikrDaily.js';
import { getStreakStatus } from './streak.service.js';
import { getExcusedSet, getExcusedIntervals, getPartnerShareSet } from './cycle.service.js';
import {
  DEFAULT_TIMEZONE_OFFSET,
  bucketDateForDayString,
  getTodayString,
} from '../utils/timezone-flexible.js';

/** Zikr type names that count as salawat/istighfar for the excused-day Noor */
const SALAWAT_RE = /(salawat|ṣalawāt|durud|darood|salat.?.?ala|istighfar|astaghfir)/i;

function shiftDateStr(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().substring(0, 10);
}

export async function getOrCreateProfile(userId: string): Promise<ISocialProfile> {
  const existing = await SocialProfile.findOne({ userId });
  if (existing) return existing;
  // Retry a few times on the (astronomically unlikely) code collision
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await SocialProfile.create({ userId, inviteCode: generateInviteCode() });
    } catch (err) {
      const isDup = (err as { code?: number })?.code === 11000;
      if (!isDup) throw err;
      // userId collision (concurrent create) → return the winner
      const winner = await SocialProfile.findOne({ userId });
      if (winner) return winner;
    }
  }
  throw new Error('Could not create social profile');
}

export interface ConnectResult {
  ok: boolean;
  message: string;
  friendUid?: string;
  friendName?: string;
  /** True when this created/resolved a pending request rather than an
   * immediate friendship — lets the UI show "waiting for them to accept" */
  pending?: boolean;
}

/**
 * Opening someone's invite link no longer connects instantly — it sends a
 * request they must accept, so a user always controls who sees their data
 * (0.6 spec). The one exception: if THEY already sent YOU a request (both
 * people opened each other's links), this accepts theirs immediately rather
 * than creating a redundant reverse request.
 */
export async function connectByCode(userId: string, code: string): Promise<ConnectResult> {
  const owner = await SocialProfile.findOne({ inviteCode: code });
  if (!owner) return { ok: false, message: 'This invite link is not valid.' };
  if (owner.userId === userId)
    return { ok: false, message: 'That is your own invite link — share it with a friend!' };

  const mine = await getOrCreateProfile(userId);

  // Blocked in either direction — identical message to "not found" so a
  // blocking user is never tipped off that they were specifically blocked.
  if (owner.blocked.includes(userId) || mine.blocked.includes(owner.userId)) {
    return { ok: false, message: 'This invite link is not valid.' };
  }

  if (mine.friends.includes(owner.userId)) {
    const friendUser = await User.findOne({ uid: owner.userId }).select('displayName');
    return {
      ok: true,
      message: 'You are already connected!',
      friendUid: owner.userId,
      friendName: friendUser?.displayName ?? 'your friend',
    };
  }

  if (mine.pendingIncoming.includes(owner.userId)) {
    return acceptRequest(userId, owner.userId);
  }

  if (mine.pendingOutgoing.includes(owner.userId)) {
    return {
      ok: true,
      pending: true,
      message: 'Request already sent — waiting for them to accept.',
      friendUid: owner.userId,
    };
  }

  if (mine.friends.length >= MAX_FRIENDS || owner.friends.length >= MAX_FRIENDS) {
    return { ok: false, message: 'Friend limit reached.' };
  }

  await Promise.all([
    SocialProfile.updateOne({ userId }, { $addToSet: { pendingOutgoing: owner.userId } }),
    SocialProfile.updateOne({ userId: owner.userId }, { $addToSet: { pendingIncoming: userId } }),
  ]);

  const friendUser = await User.findOne({ uid: owner.userId }).select('displayName');
  return {
    ok: true,
    pending: true,
    message: 'Request sent — waiting for them to accept.',
    friendUid: owner.userId,
    friendName: friendUser?.displayName ?? 'your friend',
  };
}

export interface PendingRequestItem {
  uid: string;
  displayName: string;
  photoUrl?: string;
}

export interface InvitePreview {
  displayName: string;
}

/**
 * Public, unauthenticated lookup for an invite link's unfurl preview (see
 * connectPreview.controller.ts) — deliberately returns ONLY a display name,
 * never anything else on the profile. A blocked/private relationship has no
 * bearing here: the code's owner already chose to share this exact link, and
 * a name shown in a link preview isn't more exposed than it already is on
 * the "you're invited" landing page every recipient of the link sees anyway.
 */
export async function getInvitePreview(code: string): Promise<InvitePreview | null> {
  const owner = await SocialProfile.findOne({ inviteCode: code }).select('userId');
  if (!owner) return null;
  const user = await User.findOne({ uid: owner.userId }).select('displayName');
  if (!user?.displayName) return null;
  return { displayName: user.displayName };
}

function toPendingItems(
  uids: string[],
  users: Array<{ uid: string; displayName?: string; photoUrl?: string }>
): PendingRequestItem[] {
  const byUid = new Map(users.map((u) => [u.uid, u]));
  return uids.map((uid) => {
    const u = byUid.get(uid);
    const photo = u?.photoUrl;
    return {
      uid,
      displayName: u?.displayName || 'Bustandeen user',
      ...(photo && /^https?:\/\//.test(photo) ? { photoUrl: photo } : {}),
    };
  });
}

/** Incoming requests awaiting my accept/reject (people who opened my link). */
export async function getPendingIncoming(userId: string): Promise<PendingRequestItem[]> {
  const profile = await getOrCreateProfile(userId);
  if (!profile.pendingIncoming.length) return [];
  const users = await User.find({ uid: { $in: profile.pendingIncoming } }).select(
    'uid displayName photoUrl'
  );
  return toPendingItems(profile.pendingIncoming, users);
}

export async function acceptRequest(userId: string, requesterUid: string): Promise<ConnectResult> {
  const mine = await getOrCreateProfile(userId);
  if (!mine.pendingIncoming.includes(requesterUid)) {
    return { ok: false, message: 'No pending request from this user.' };
  }
  const requester = await SocialProfile.findOne({ userId: requesterUid });
  if (
    mine.friends.length >= MAX_FRIENDS ||
    (requester && requester.friends.length >= MAX_FRIENDS)
  ) {
    return { ok: false, message: 'Friend limit reached.' };
  }
  const now = new Date();
  await Promise.all([
    SocialProfile.updateOne(
      { userId },
      {
        $pull: { pendingIncoming: requesterUid },
        $addToSet: { friends: requesterUid },
        $set: { [`friendSince.${requesterUid}`]: now },
      }
    ),
    SocialProfile.updateOne(
      { userId: requesterUid },
      {
        $pull: { pendingOutgoing: userId },
        $addToSet: { friends: userId },
        $set: { [`friendSince.${userId}`]: now },
      }
    ),
  ]);
  const friendUser = await User.findOne({ uid: requesterUid }).select('displayName');
  return {
    ok: true,
    message: 'Connected!',
    friendUid: requesterUid,
    friendName: friendUser?.displayName ?? 'your friend',
  };
}

export async function rejectRequest(
  userId: string,
  requesterUid: string
): Promise<{ ok: boolean }> {
  await Promise.all([
    SocialProfile.updateOne({ userId }, { $pull: { pendingIncoming: requesterUid } }),
    SocialProfile.updateOne({ userId: requesterUid }, { $pull: { pendingOutgoing: userId } }),
  ]);
  return { ok: true };
}

/** Blocking is one-directional and immediately tears down any existing
 * friendship or pending request in either direction — the blocked user is
 * never notified, they simply find the invite link "not valid" if they try
 * to reconnect (see connectByCode). */
export async function blockUser(userId: string, targetUid: string): Promise<{ ok: boolean }> {
  if (userId === targetUid) return { ok: false };
  await Promise.all([
    SocialProfile.updateOne(
      { userId },
      {
        $addToSet: { blocked: targetUid },
        $pull: { friends: targetUid, pendingIncoming: targetUid, pendingOutgoing: targetUid },
        $unset: { [`friendSince.${targetUid}`]: '' },
      }
    ),
    SocialProfile.updateOne(
      { userId: targetUid },
      {
        $pull: { friends: userId, pendingIncoming: userId, pendingOutgoing: userId },
        $unset: { [`friendSince.${userId}`]: '' },
      }
    ),
  ]);
  return { ok: true };
}

export async function unblockUser(userId: string, targetUid: string): Promise<{ ok: boolean }> {
  await SocialProfile.updateOne({ userId }, { $pull: { blocked: targetUid } });
  return { ok: true };
}

export async function getBlockedList(userId: string): Promise<PendingRequestItem[]> {
  const profile = await getOrCreateProfile(userId);
  if (!profile.blocked.length) return [];
  const users = await User.find({ uid: { $in: profile.blocked } }).select(
    'uid displayName photoUrl'
  );
  return toPendingItems(profile.blocked, users);
}

/** Full leaderboard opt-out — see ISocialProfile.invisible. */
export async function setInvisible(
  userId: string,
  invisible: boolean
): Promise<{ ok: boolean; invisible: boolean }> {
  await getOrCreateProfile(userId);
  await SocialProfile.updateOne({ userId }, { $set: { invisible } });
  return { ok: true, invisible };
}

export async function unfriend(userId: string, friendUid: string): Promise<{ ok: boolean }> {
  await Promise.all([
    SocialProfile.updateOne(
      { userId },
      { $pull: { friends: friendUid }, $unset: { [`friendSince.${friendUid}`]: '' } }
    ),
    SocialProfile.updateOne(
      { userId: friendUid },
      { $pull: { friends: userId }, $unset: { [`friendSince.${userId}`]: '' } }
    ),
  ]);
  return { ok: true };
}

// ─── Friends list (manage view) ──────────────────────────────────────────────

export interface FriendListItem {
  uid: string;
  displayName: string;
  photoUrl?: string;
  /** ISO date the friendship began; null for connections made before this field existed */
  connectedSince: string | null;
}

export async function getFriendsList(userId: string): Promise<FriendListItem[]> {
  const profile = await getOrCreateProfile(userId);
  if (profile.friends.length === 0) return [];

  const users = await User.find({ uid: { $in: profile.friends } }).select(
    'uid displayName photoUrl'
  );
  const byUid = new Map(users.map((u) => [u.uid, u]));

  const list = profile.friends.map((uid) => {
    const u = byUid.get(uid);
    const photo = u?.photoUrl;
    const since = profile.friendSince?.get(uid);
    return {
      uid,
      displayName: u?.displayName || 'Bustandeen user',
      ...(photo && /^https?:\/\//.test(photo) ? { photoUrl: photo } : {}),
      connectedSince: since ? since.toISOString() : null,
    };
  });

  // Newest connections first; undated (legacy) connections last
  list.sort((a, b) => {
    if (!a.connectedSince && !b.connectedSince) return a.displayName.localeCompare(b.displayName);
    if (!a.connectedSince) return 1;
    if (!b.connectedSince) return -1;
    return b.connectedSince.localeCompare(a.connectedSince);
  });

  return list;
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export interface FriendStats {
  uid: string;
  displayName: string;
  /** Only http(s) URLs — base64 data-URL photos are skipped to keep the payload small */
  photoUrl?: string;
  /** Full country name from the user's profile (e.g. "Bangladesh") */
  country?: string;
  isMe: boolean;
  salatToday: number; // 0..5 fard prayers completed/kaza today
  /** How many fard prayer windows have opened so far today (0–5, time-of-day aware) */
  prayersDue: number;
  zikrStreak: number;
  zikrState: string; // active | grace | none | paused
  zikrToday: number;
  zikrGoal: number;
  zikrGoalMet: boolean;
  fastsThisMonth: number;
  /** Fasting today (completed, or intended while the day is in progress) */
  fastedToday: boolean;
  quranStreak: number;
  quranPagesToday: number;
  quranGoal: number;
  score: number; // Noor, 0..100
  /** Present ONLY for the one friend who has opted in to share cycle status
   * with THIS viewer specifically (see cycle.service.ts#setPartnerSync) —
   * absent for everyone else, preserving the same "cannot tell from the
   * leaderboard" privacy the excused-day score substitution relies on. */
  onCycle?: boolean;
}

/**
 * Approximate number of fard prayer windows that have opened at the current
 * local time. timezoneOffset is POSITIVE EAST (frontend -getTimezoneOffset()).
 * Fixed-hour thresholds are a fair global approximation; actual adhan times
 * vary by location and season, but give a consistent ranking basis.
 */
function prayersDueNow(timezoneOffset: number, today?: string): number {
  // `today` is the tracking day being scored. Between midnight and Fajr it is
  // still YESTERDAY's date, so all five of its prayers have long since opened:
  // reading the clock alone said 0 due and produced chips like "5/0 prayers".
  if (today && today < getTodayString(timezoneOffset)) return 5;
  const nowUtc = new Date();
  const localMinutes =
    (((nowUtc.getUTCHours() * 60 + nowUtc.getUTCMinutes() + timezoneOffset) % 1440) + 1440) % 1440;
  const h = localMinutes / 60;
  if (h >= 20) return 5; // Isha has opened
  if (h >= 18.5) return 4; // Maghrib has opened
  if (h >= 16) return 3; // Asr has opened
  if (h >= 12.5) return 2; // Dhuhr has opened
  if (h >= 5) return 1; // Fajr has opened
  return 0;
}

/**
 * Daily Noor (max 100) — deliberately transparent (Istiak's spec, 2026-07-09):
 *   up to 50  — today's fard prayers, scaled to prayers elapsed today
 *   up to 20  — zikr STREAK (2 per day, capped at 10 days)
 *   up to 20  — today's Quran reading vs the user's daily goal (full 20 when met)
 *   +10       — fasting today (completed, or intended while the day runs)
 *
 * The prayer score is "optimistic": if 3 of 5 prayers have passed today and
 * all 3 are complete, that earns the full 50 Noor — the Ummah is not penalised
 * for prayers whose time has not yet arrived. This keeps the leaderboard fair
 * and encouraging throughout the day.
 */
function computeScore(
  s: Omit<
    FriendStats,
    'score' | 'uid' | 'displayName' | 'photoUrl' | 'isMe' | 'country' | 'prayersDue'
  >,
  prayersDue: number
): number {
  // Optimistic salat scoring: 50 pts if all elapsed prayers are done; pro-rated otherwise
  const due = Math.max(1, Math.min(5, prayersDue));
  const done = Math.min(due, s.salatToday);
  const salatPts = Math.round((done / due) * 50);
  const zikrStreakPts = Math.min(10, s.zikrStreak) * 2;
  const quranPts = Math.round(
    Math.min(1, s.quranGoal > 0 ? s.quranPagesToday / s.quranGoal : 0) * 20
  );
  const fastPts = s.fastedToday ? 10 : 0;
  return salatPts + zikrStreakPts + quranPts + fastPts;
}

/**
 * Excused-day Noor (Rayhanah Cycle) — same max 100, built from what remains
 * fully open during hayd/nifas (dhikr, Quran listening, salawat/istighfar):
 *   up to 40 — today's zikr vs the daily goal (proportional)
 *   up to 20 — zikr streak (2/day, cap 10 days — zikr is never interrupted)
 *   up to 30 — Quran engagement (listening counts) vs the daily goal
 *   +10      — any salawat/istighfar dhikr today
 * PRIVACY: identical shape to the normal score; no flag ever leaves the
 * server, and the visible chips are filled from these same real acts so a
 * friend cannot distinguish an excused day from an ordinary one.
 */
function computeExcusedScore(input: {
  zikrToday: number;
  zikrGoal: number;
  zikrStreak: number;
  quranPagesToday: number;
  quranGoal: number;
  salawatDone: boolean;
}): number {
  const zikrPts = Math.round(
    Math.min(1, input.zikrGoal > 0 ? input.zikrToday / input.zikrGoal : 0) * 40
  );
  const streakPts = Math.min(10, input.zikrStreak) * 2;
  const quranPts = Math.round(
    Math.min(1, input.quranGoal > 0 ? input.quranPagesToday / input.quranGoal : 0) * 30
  );
  const salawatPts = input.salawatDone ? 10 : 0;
  return zikrPts + streakPts + quranPts + salawatPts;
}

async function statsForUser(
  uid: string,
  viewerUid: string,
  today: string,
  timezoneOffset: number,
  excusedToday = false,
  sharesCycleWithViewer = false
): Promise<FriendStats> {
  const monthStart = today.substring(0, 8) + '01';
  const quranSince = shiftDateStr(today, -30);

  const [user, zikr, salatLog, fastsThisMonth, todayFastLog, quranLogs, quranProfile] =
    await Promise.all([
      User.findOne({ uid }).select('displayName photoUrl country'),
      getStreakStatus(uid, timezoneOffset, today),
      SalatLog.findOne({ userId: uid, date: today }),
      FastingLog.countDocuments({
        userId: uid,
        status: 'completed',
        date: { $gte: monthStart, $lte: today },
      }),
      FastingLog.findOne({ userId: uid, date: today }).select('status'),
      QuranLog.find({ userId: uid, date: { $gte: quranSince, $lte: today } }).select(
        'date pages ayat'
      ),
      QuranProfile.findOne({ userId: uid }).select('dailyGoalAyat'),
    ]);

  let salatToday = 0;
  if (salatLog) {
    for (const pid of PRAYER_IDS) {
      const s = salatLog.prayers[pid]?.status;
      if (s === 'completed' || s === 'kaza') salatToday++;
    }
  }

  // v4 units: ayat + pages·10 — reading and listening both count
  const quranByDate = new Map(
    quranLogs.map((l) => [l.date, Math.round((l.ayat ?? 0) + (l.pages ?? 0) * 10)])
  );
  const quranPagesToday = quranByDate.get(today) ?? 0;
  let quranStreak = 0;
  let cursor = quranPagesToday > 0 ? today : shiftDateStr(today, -1);
  while ((quranByDate.get(cursor) ?? 0) > 0 && quranStreak < 30) {
    quranStreak++;
    cursor = shiftDateStr(cursor, -1);
  }

  const prayersDue = prayersDueNow(timezoneOffset, today);

  const base = {
    isMe: uid === viewerUid,
    salatToday,
    prayersDue,
    zikrStreak: zikr.currentStreak,
    zikrState: zikr.state,
    zikrToday: zikr.todayTotal,
    zikrGoal: zikr.dailyTarget,
    zikrGoalMet: zikr.goalMet,
    fastsThisMonth,
    fastedToday: todayFastLog?.status === 'completed' || todayFastLog?.status === 'intended',
    quranStreak,
    quranPagesToday,
    quranGoal: quranProfile?.dailyGoalAyat ?? 20,
  };

  let score = computeScore(base, prayersDue);

  if (excusedToday) {
    // Rayhanah Cycle substitution. Check for salawat/istighfar in today's
    // per-type buckets, score from the permitted acts, then fill the salat
    // and fasting chips from that same real effort so the row looks like any
    // other active day (Istiak's spec: nothing may reveal an excused day).
    const bucket = bucketDateForDayString(today, timezoneOffset);
    const todayTypes = bucket
      ? await ZikrDaily.find({ userId: uid, date: bucket }).select('zikrType count')
      : [];
    const salawatDone = todayTypes.some((t) => SALAWAT_RE.test(t.zikrType) && t.count > 0);

    score = computeExcusedScore({
      zikrToday: base.zikrToday,
      zikrGoal: base.zikrGoal,
      zikrStreak: base.zikrStreak,
      quranPagesToday: base.quranPagesToday,
      quranGoal: base.quranGoal,
      salawatDone,
    });
    // Cap the substituted salat chip at the number of prayers whose time has
    // plausibly arrived at the viewer's local clock — a 4/5 at Dhuhr time was
    // a dead giveaway that the number was synthetic (defeating the privacy
    // goal). Coarse fixed windows; friends overwhelmingly share a locale.
    // timezoneOffset is POSITIVE EAST here (frontend sends -getTimezoneOffset())
    const prayersElapsed = prayersDue;
    base.salatToday = Math.min(prayersElapsed, Math.round(5 * Math.min(1, score / 100)));
    base.fastedToday = base.zikrGoalMet;
  }

  const photo = user?.photoUrl;
  return {
    uid,
    displayName: user?.displayName || 'Bustandeen user',
    ...(photo && /^https?:\/\//.test(photo) ? { photoUrl: photo } : {}),
    ...(user?.country ? { country: user.country } : {}),
    ...base,
    score,
    ...(sharesCycleWithViewer ? { onCycle: excusedToday } : {}),
  };
}

export interface SocialSummary {
  inviteCode: string;
  leaderboard: FriendStats[]; // me + friends, ranked by score desc
  /** Whether the VIEWER has opted out of appearing on others' leaderboards */
  invisible: boolean;
  /** Count of incoming friend requests awaiting the viewer's accept/reject */
  pendingCount: number;
}

export async function getSummary(
  userId: string,
  today?: string,
  timezoneOffset: number = DEFAULT_TIMEZONE_OFFSET
): Promise<SocialSummary> {
  // The real frontend always sends `today` explicitly; this fallback only
  // matters for callers that omit it. It must still honor timezoneOffset —
  // the plain UTC date silently disagreed with the caller's own "today" for
  // several hours around the UTC day boundary (e.g. UTC+6 callers between
  // 18:00–23:59 UTC), which showed friends' own excused/cycle days as
  // ordinary ones.
  const end = today ?? getTodayString(timezoneOffset);
  const profile = await getOrCreateProfile(userId);

  // A friend who has gone invisible (see ISocialProfile.invisible) is a full
  // opt-out — excluded from EVERY friend's leaderboard, not just new ones.
  // The viewer always sees their own row regardless of their own setting.
  const friendUids = profile.friends.slice(0, MAX_FRIENDS);
  const friendProfiles = friendUids.length
    ? await SocialProfile.find({ userId: { $in: friendUids } }).select('userId invisible')
    : [];
  const visibleFriendUids = friendProfiles.filter((p) => !p.invisible).map((p) => p.userId);

  // Everyone is judged on the VIEWER's calendar date — a consistent basis for
  // one ranked list (documented in CLAUDE.md).
  const uids = [userId, ...visibleFriendUids];
  const [excused, cycleShares] = await Promise.all([
    getExcusedSet(uids, end),
    getPartnerShareSet(uids, userId),
  ]);
  const stats = await Promise.all(
    uids.map((uid) =>
      statsForUser(uid, userId, end, timezoneOffset, excused.has(uid), cycleShares.has(uid))
    )
  );

  stats.sort(
    (a, b) =>
      b.score - a.score || b.zikrStreak - a.zikrStreak || a.displayName.localeCompare(b.displayName)
  );

  return {
    inviteCode: profile.inviteCode,
    leaderboard: stats,
    invisible: profile.invisible,
    pendingCount: profile.pendingIncoming.length,
  };
}

// ─── Noor (navbar capsules) ───────────────────────────────────────────────────

export interface NoorResult {
  today: number;
  allTime: number;
}

/**
 * Today's Noor = the live leaderboard score.
 * All-time Noor = the daily formula applied to every recorded day of the last
 * 365 days and summed — it only ever grows. (A streak is a live property, so
 * the historical zikr component uses that day's goal progress instead;
 * current goals are applied to history — good enough for a motivation number.)
 */
export async function getNoor(
  userId: string,
  today?: string,
  timezoneOffset: number = DEFAULT_TIMEZONE_OFFSET
): Promise<NoorResult> {
  // See getSummary's identical fallback for why this must honor timezoneOffset.
  const end = today ?? getTodayString(timezoneOffset);
  const since = shiftDateStr(end, -364);

  const excusedIntervals = await getExcusedIntervals(userId);
  const isExcusedDay = (day: string): boolean =>
    excusedIntervals.some(
      (iv) => iv.start <= day && (iv.end === null ? day <= end : day <= iv.end)
    );

  const [me, salatLogs, zikrRows, quranLogs, fastLogs, zikrGoalDoc, quranProfile] =
    await Promise.all([
      statsForUser(userId, userId, end, timezoneOffset, isExcusedDay(end)),
      SalatLog.find({ userId, date: { $gte: since, $lte: end } }).select('date prayers'),
      ZikrDaily.aggregate([
        { $match: { userId, date: { $gte: new Date(since + 'T00:00:00.000Z') } } },
        {
          $group: {
            _id: '$date',
            total: { $sum: '$count' },
            salawat: {
              $sum: {
                $cond: [
                  {
                    $regexMatch: {
                      input: '$zikrType',
                      regex: 'salawat|durud|darood|istighfar|astaghfir',
                      options: 'i',
                    },
                  },
                  '$count',
                  0,
                ],
              },
            },
          },
        },
      ]) as Promise<Array<{ _id: Date; total: number; salawat: number }>>,
      QuranLog.find({ userId, date: { $gte: since, $lte: end } }).select('date pages ayat'),
      FastingLog.find({ userId, status: 'completed', date: { $gte: since, $lte: end } }).select(
        'date'
      ),
      ZikrGoal.findOne({ userId }),
      QuranProfile.findOne({ userId }).select('dailyGoalAyat'),
    ]);

  const zikrGoal = zikrGoalDoc?.dailyTarget ?? 100;
  const quranGoal = quranProfile?.dailyGoalAyat ?? 20;

  const salatByDay = new Map<string, number>();
  for (const log of salatLogs) {
    let done = 0;
    for (const pid of PRAYER_IDS) {
      const st = log.prayers[pid]?.status;
      if (st === 'completed' || st === 'kaza') done++;
    }
    salatByDay.set(log.date, done);
  }
  const zikrByDay = new Map<string, number>();
  const salawatByDay = new Map<string, number>();
  for (const r of zikrRows) {
    // Bucket convention: the UTC date part equals the user's local date
    const k = new Date(r._id).toISOString().split('T')[0] ?? '';
    zikrByDay.set(k, (zikrByDay.get(k) ?? 0) + r.total);
    salawatByDay.set(k, (salawatByDay.get(k) ?? 0) + (r.salawat ?? 0));
  }
  const quranByDay = new Map(
    quranLogs.map((l) => [l.date, Math.round((l.ayat ?? 0) + (l.pages ?? 0) * 10)])
  );
  const fastDays = new Set(fastLogs.map((l) => l.date));

  const allDays = new Set<string>([
    ...salatByDay.keys(),
    ...zikrByDay.keys(),
    ...quranByDay.keys(),
    ...fastDays,
  ]);

  let allTime = 0;
  for (const day of allDays) {
    if (isExcusedDay(day)) {
      // Rayhanah Cycle day — reward the acts that remained open (max 100):
      // zikr 50 · Quran (listening) 40 · salawat/istighfar 10
      const zikrPts = Math.round(Math.min(1, (zikrByDay.get(day) ?? 0) / zikrGoal) * 50);
      const quranPts = Math.round(Math.min(1, (quranByDay.get(day) ?? 0) / quranGoal) * 40);
      const salawatPts = (salawatByDay.get(day) ?? 0) > 0 ? 10 : 0;
      allTime += zikrPts + quranPts + salawatPts;
      continue;
    }
    const salatPts = Math.min(5, salatByDay.get(day) ?? 0) * 10;
    const zikrPts = Math.round(Math.min(1, (zikrByDay.get(day) ?? 0) / zikrGoal) * 20);
    const quranPts = Math.round(Math.min(1, (quranByDay.get(day) ?? 0) / quranGoal) * 20);
    const fastPts = fastDays.has(day) ? 10 : 0;
    allTime += salatPts + zikrPts + quranPts + fastPts;
  }

  return { today: me.score, allTime };
}
