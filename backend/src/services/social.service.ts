import { isAvatarId } from '../utils/avatars.js';
import SocialProfile, {
  effectiveVisibility,
  generateInviteCode,
  ISocialProfile,
  MAX_FRIENDS,
  SecretAreas,
  Visibility,
} from '../models/SocialProfile.js';
import User from '../models/User.js';
import SalatLog, { PRAYER_IDS } from '../models/SalatLog.js';
import FastingLog from '../models/FastingLog.js';
import QuranLog from '../models/QuranLog.js';
import QuranProfile from '../models/QuranProfile.js';
import { getStreakStatus } from './streak.service.js';
import { getNoorSummary, getAllTimeNoor } from './noor.service.js';
import { getExcusedSet, getPartnerShareSet } from './cycle.service.js';
import { DEFAULT_TIMEZONE_OFFSET, getTodayString } from '../utils/timezone-flexible.js';

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
      // New people share consistency only until they choose otherwise (T3.6)
      return await SocialProfile.create({
        userId,
        inviteCode: generateInviteCode(),
        visibility: 'streaks',
      });
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
  avatarId?: string;
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

/** What friends may see of someone's picture: an https photo (never a data:
 * URL, which can be large) or a preset avatar id. */
function publicPicture(u: { photoUrl?: string; avatarId?: string } | null | undefined): {
  photoUrl?: string;
  avatarId?: string;
} {
  const photo = u?.photoUrl;
  if (photo && /^https?:\/\//.test(photo)) return { photoUrl: photo };
  if (isAvatarId(u?.avatarId)) return { avatarId: u.avatarId };
  return {};
}

function toPendingItems(
  uids: string[],
  users: Array<{ uid: string; displayName?: string; photoUrl?: string; avatarId?: string }>
): PendingRequestItem[] {
  const byUid = new Map(users.map((u) => [u.uid, u]));
  return uids.map((uid) => {
    const u = byUid.get(uid);
    return {
      uid,
      displayName: u?.displayName || 'Bustandeen user',
      ...publicPicture(u),
    };
  });
}

/** Incoming requests awaiting my accept/reject (people who opened my link). */
export async function getPendingIncoming(userId: string): Promise<PendingRequestItem[]> {
  const profile = await getOrCreateProfile(userId);
  if (!profile.pendingIncoming.length) return [];
  const users = await User.find({ uid: { $in: profile.pendingIncoming } }).select(
    'uid displayName photoUrl avatarId'
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
    'uid displayName photoUrl avatarId'
  );
  return toPendingItems(profile.blocked, users);
}

export interface PrivacySettings {
  visibility: Visibility;
  secret: SecretAreas;
}

const NO_SECRET: SecretAreas = { salat: false, zikr: false, quran: false, fasting: false };

function privacyOf(
  p: Pick<ISocialProfile, 'visibility' | 'invisible' | 'secret'>
): PrivacySettings {
  return {
    visibility: effectiveVisibility(p),
    secret: {
      salat: !!p.secret?.salat,
      zikr: !!p.secret?.zikr,
      quran: !!p.secret?.quran,
      fasting: !!p.secret?.fasting,
    },
  };
}

/** What friends see of me + my secret deeds. Either part may be sent alone. */
export async function setPrivacy(
  userId: string,
  update: { visibility?: Visibility; secret?: Partial<SecretAreas> }
): Promise<{ ok: boolean; privacy: PrivacySettings }> {
  await getOrCreateProfile(userId);
  const $set: Record<string, unknown> = {};
  if (update.visibility) {
    $set['visibility'] = update.visibility;
    $set['invisible'] = update.visibility === 'hidden';
  }
  for (const [area, on] of Object.entries(update.secret ?? {})) {
    if (typeof on === 'boolean') $set[`secret.${area}`] = on;
  }
  const updated = await SocialProfile.findOneAndUpdate(
    { userId },
    // The user's own choice is never undone by the migration's --revert
    { $set, ...(update.visibility ? { $unset: { visibilitySource: '' } } : {}) },
    { returnDocument: 'after' }
  );
  return { ok: true, privacy: privacyOf(updated ?? { invisible: false, secret: NO_SECRET }) };
}

/** Pre-T3.6 alias (PATCH /api/social/invisible), kept one release for cached
 * clients: on = hidden; off = full detail, which is what that switch meant. */
export async function setInvisible(
  userId: string,
  invisible: boolean
): Promise<{ ok: boolean; invisible: boolean }> {
  await setPrivacy(userId, { visibility: invisible ? 'hidden' : 'detail' });
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
  avatarId?: string;
  /** ISO date the friendship began; null for connections made before this field existed */
  connectedSince: string | null;
}

export async function getFriendsList(userId: string): Promise<FriendListItem[]> {
  const profile = await getOrCreateProfile(userId);
  if (profile.friends.length === 0) return [];

  const users = await User.find({ uid: { $in: profile.friends } }).select(
    'uid displayName photoUrl avatarId'
  );
  const byUid = new Map(users.map((u) => [u.uid, u]));

  const list = profile.friends.map((uid) => {
    const u = byUid.get(uid);
    const since = profile.friendSince?.get(uid);
    return {
      uid,
      displayName: u?.displayName || 'Bustandeen user',
      ...publicPicture(u),
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

// ─── Circle ───────────────────────────────────────────────────────────────────

/**
 * One person in the viewer's circle. What is present depends on what that
 * person chose to share (T3.6): the viewer's own row is always full detail;
 * a friend at 'streaks' carries only the consistency fields; and any area a
 * friend keeps secret is left out entirely (absent, not zero), as is its share
 * of the Noor friends see.
 */
export interface FriendStats {
  uid: string;
  displayName: string;
  /** Only http(s) URLs — base64 data-URL photos are skipped to keep the payload small */
  photoUrl?: string;
  avatarId?: string;
  /** Full country name from the user's profile (e.g. "Bangladesh") */
  country?: string;
  isMe: boolean;
  /** How much this row shares: 'detail' (always, for the viewer's own row) or 'streaks' */
  visibility: 'detail' | 'streaks';

  // Consistency: shared at both levels (each one left out when its area is secret)
  zikrStreak?: number;
  zikrState?: string; // active | grace | none | paused
  quranStreak?: number;
  /** Active days this Fri-Thu week so far, including today */
  activeDays: number;
  /** Days of the week so far, including today */
  weekDays: number;

  // Full detail only
  salatToday?: number; // 0..5 fard prayers completed/kaza today
  /** How many fard prayer windows have opened so far today (0–5, time-of-day aware) */
  prayersDue?: number;
  zikrToday?: number;
  zikrGoal?: number;
  zikrGoalMet?: boolean;
  fastsThisMonth?: number;
  /** Fasting today (completed, or intended while the day is in progress) */
  fastedToday?: boolean;
  quranPagesToday?: number;
  quranGoal?: number;
  score?: number; // Noor today, 0..100 (see noor.service.ts for the formula)
  /** Average daily Noor this Fri-Thu week so far */
  weekScore?: number;
  /** Week-so-far totals (Fri-Thu, including today) behind the "This week" chips */
  week?: {
    salat?: number;
    zikr?: number;
    quran?: number;
    fasts?: number;
    activeDays: number;
    days: number;
  };
  /** The friend's usual daily Noor (average of recent active days), or null while there is too little history */
  usualScore?: number | null;
  /** Distinct good acts today */
  actsToday?: number;
  /** Present ONLY for the one friend who has opted in to share cycle status
   * with THIS viewer specifically (see cycle.service.ts#setPartnerSync) —
   * absent for everyone else, preserving the same "cannot tell from the
   * circle" privacy the excused-day score substitution relies on. */
  onCycle?: boolean;
}

/**
 * Approximate number of fard prayer windows that have opened at the current
 * local time. timezoneOffset is POSITIVE EAST (frontend -getTimezoneOffset()).
 * Fixed-hour thresholds are a fair global approximation; actual adhan times
 * vary by location and season, but give a consistent basis.
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

async function statsForUser(
  uid: string,
  viewerUid: string,
  today: string,
  timezoneOffset: number,
  privacy: PrivacySettings,
  excusedToday = false,
  sharesCycleWithViewer = false
): Promise<FriendStats> {
  const isMe = uid === viewerUid;
  // The viewer always sees all of their own row
  const level: 'detail' | 'streaks' =
    isMe || privacy.visibility === 'detail' ? 'detail' : 'streaks';
  const secret = isMe ? NO_SECRET : privacy.secret;

  const monthStart = today.substring(0, 8) + '01';
  const quranSince = shiftDateStr(today, -30);

  const [user, zikr, salatLog, fastsThisMonth, todayFastLog, quranLogs, quranProfile, noor] =
    await Promise.all([
      User.findOne({ uid }).select('displayName photoUrl avatarId country'),
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
      // Secret areas are left out of the Noor friends see (not of your own)
      getNoorSummary(uid, today, secret),
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
  const score = noor.today.score;
  const zikrGoalMet = secret.zikr ? false : zikr.goalMet;
  let fastedToday = todayFastLog?.status === 'completed' || todayFastLog?.status === 'intended';

  if (excusedToday) {
    // Rayhanah Cycle substitution. Score from the permitted acts, then fill
    // the salat and fasting chips from that same real effort so the row looks
    // like any other active day (Istiak's spec: nothing may reveal an excused
    // day). Cap the substituted salat chip at the number of prayers whose time
    // has plausibly arrived at the viewer's local clock — a 4/5 at Dhuhr time
    // was a dead giveaway that the number was synthetic. Coarse fixed windows;
    // friends overwhelmingly share a locale.
    salatToday = Math.min(prayersDue, Math.round(5 * Math.min(1, score / 100)));
    fastedToday = zikrGoalMet;
  }

  const activeDays = noor.weekPast.activeDays + (noor.today.base > 0 ? 1 : 0);
  const row: FriendStats = {
    uid,
    displayName: user?.displayName || 'Bustandeen user',
    ...publicPicture(user),
    ...(user?.country ? { country: user.country } : {}),
    isMe,
    visibility: level,
    ...(secret.zikr ? {} : { zikrStreak: zikr.currentStreak, zikrState: zikr.state }),
    ...(secret.quran ? {} : { quranStreak }),
    activeDays,
    weekDays: noor.weekPast.days,
    ...(sharesCycleWithViewer ? { onCycle: excusedToday } : {}),
  };
  if (level === 'streaks') return row;

  return {
    ...row,
    ...(secret.salat ? {} : { salatToday, prayersDue }),
    ...(secret.zikr
      ? {}
      : { zikrToday: zikr.todayTotal, zikrGoal: zikr.dailyTarget, zikrGoalMet: zikr.goalMet }),
    ...(secret.fasting ? {} : { fastsThisMonth, fastedToday }),
    ...(secret.quran ? {} : { quranPagesToday, quranGoal: quranProfile?.dailyGoalAyat ?? 20 }),
    score,
    weekScore: noor.week,
    week: {
      ...(secret.salat ? {} : { salat: noor.weekPast.salat + salatToday }),
      ...(secret.zikr ? {} : { zikr: noor.weekPast.zikr + zikr.todayTotal }),
      ...(secret.quran ? {} : { quran: noor.weekPast.quran + quranPagesToday }),
      ...(secret.fasting ? {} : { fasts: noor.weekPast.fasts + (fastedToday ? 1 : 0) }),
      activeDays,
      days: noor.weekPast.days,
    },
    usualScore: noor.usual,
    actsToday: noor.today.acts,
  };
}

export interface SocialSummary {
  inviteCode: string;
  /** Me first, then friends by their longest shared streak, then name. No ranking. */
  circle: FriendStats[];
  /** @deprecated alias of `circle` for clients cached before T3.6; remove next release */
  leaderboard: FriendStats[];
  /** The VIEWER's own privacy choices */
  privacy: PrivacySettings;
  /** @deprecated `privacy.visibility === 'hidden'`, for clients cached before T3.6 */
  invisible: boolean;
  /** Count of incoming friend requests awaiting the viewer's accept/reject */
  pendingCount: number;
}

const longestStreak = (f: FriendStats): number => Math.max(f.zikrStreak ?? 0, f.quranStreak ?? 0);

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

  // A hidden friend is a full opt-out — excluded from EVERY friend's circle,
  // not just new ones. The viewer always sees their own row.
  const friendUids = profile.friends.slice(0, MAX_FRIENDS);
  const friendProfiles = friendUids.length
    ? await SocialProfile.find({ userId: { $in: friendUids } }).select(
        'userId invisible visibility secret'
      )
    : [];
  const privacyByUid = new Map<string, PrivacySettings>();
  for (const p of friendProfiles) {
    const pv = privacyOf(p);
    if (pv.visibility !== 'hidden') privacyByUid.set(p.userId, pv);
  }
  const visibleFriendUids = [...privacyByUid.keys()];

  // Everyone is judged on the VIEWER's calendar date — one consistent basis.
  const uids = [userId, ...visibleFriendUids];
  const [excused, cycleShares] = await Promise.all([
    getExcusedSet(uids, end),
    getPartnerShareSet(uids, userId),
  ]);
  const stats = await Promise.all(
    uids.map((uid) =>
      statsForUser(
        uid,
        userId,
        end,
        timezoneOffset,
        privacyByUid.get(uid) ?? { visibility: 'detail', secret: NO_SECRET },
        excused.has(uid),
        cycleShares.has(uid)
      )
    )
  );

  // No ranking (FIQH-03, D3): ordering by Noor would also reveal the score of
  // anyone who shares consistency only.
  stats.sort(
    (a, b) =>
      Number(b.isMe) - Number(a.isMe) ||
      longestStreak(b) - longestStreak(a) ||
      a.displayName.localeCompare(b.displayName)
  );

  const privacy = privacyOf(profile);
  return {
    inviteCode: profile.inviteCode,
    circle: stats,
    leaderboard: stats,
    privacy,
    invisible: privacy.visibility === 'hidden',
    pendingCount: profile.pendingIncoming.length,
  };
}

// ─── Noor (navbar capsules) ───────────────────────────────────────────────────

export interface NoorResult {
  today: number;
  allTime: number;
}

/**
 * Today's Noor = the viewer's own score in the circle.
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
  const [summary, allTime] = await Promise.all([
    getNoorSummary(userId, end),
    getAllTimeNoor(userId, end),
  ]);
  return { today: summary.today.score, allTime };
}
