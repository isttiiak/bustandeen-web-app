import Donation from '../models/Donation.js';
import DonationStats from '../models/DonationStats.js';
import ZikrRequest from '../models/ZikrRequest.js';
import User from '../models/User.js';
import AdminAuditLog from '../models/AdminAuditLog.js';
import { countOpenFeedback } from './feedback.service.js';
import { excludeAdminUids } from './adminAccount.service.js';
import type { AdminRole, AnsarDomain } from '../models/AdminAccount.js';

export interface AdminOverviewStats {
  pendingSadaqah?: number;
  pendingZikrRequests?: number;
  openFeedback?: number;
  servant?: {
    totalVerifiedAmount: number;
    newUsersThisWeek: number;
    totalUsers: number;
    recentAuditLog: { actorEmail: string; action: string; createdAt: Date }[];
    activity: UserActivity;
  };
}

/**
 * How many people use the app, from User.lastActiveAt (stamped on every app
 * open by /api/auth/verify, and on zikr logs). Staff and disabled accounts are
 * left out. "Came back" looks at people who signed up 8 to 35 days ago and
 * counts those seen again at least 7 days after signing up.
 */
export interface UserActivity {
  today: number;
  week: number;
  month: number;
  /** Sign-ups per rolling 7-day window, newest first: [0] is the last 7 days. */
  signupsByWeek: number[];
  cameBack: { cohort: number; returned: number };
}

const DAY_MS = 24 * 60 * 60 * 1000;
export const SIGNUP_WEEKS = 8;

export const getUserActivity = async (now = new Date()): Promise<UserActivity> => {
  const base = { ...(await excludeAdminUids()), disabled: { $ne: true } };
  const ago = (days: number) => new Date(now.getTime() - days * DAY_MS);
  const activeSince = (days: number) =>
    User.countDocuments({ ...base, lastActiveAt: { $gte: ago(days) } });

  const [today, week, month, signupsByWeek, cohort, returned] = await Promise.all([
    activeSince(1),
    activeSince(7),
    activeSince(30),
    Promise.all(
      Array.from({ length: SIGNUP_WEEKS }, (_, i) =>
        User.countDocuments({ ...base, createdAt: { $gte: ago(7 * (i + 1)), $lt: ago(7 * i) } })
      )
    ),
    User.countDocuments({ ...base, createdAt: { $gte: ago(35), $lt: ago(8) } }),
    User.countDocuments({
      ...base,
      createdAt: { $gte: ago(35), $lt: ago(8) },
      $expr: { $gte: ['$lastActiveAt', { $add: ['$createdAt', 7 * DAY_MS] }] },
    }),
  ]);
  return { today, week, month, signupsByWeek, cameBack: { cohort, returned } };
};

/**
 * Returns a DIFFERENT shape per caller's role/domain — the only gate on this
 * endpoint is requireAdminAuth (any active admin), so the service itself must
 * never compute a cross-domain number for a request that shouldn't see it,
 * rather than relying on the frontend to just not render it.
 */
export const getOverview = async (
  role: AdminRole,
  ansarDomain: AnsarDomain | null
): Promise<AdminOverviewStats> => {
  const isServant = role === 'servant';
  const canSeeSadaqah = isServant || ansarDomain === 'sadaqah';
  const canSeeGeneral = isServant || ansarDomain === 'general';

  const stats: AdminOverviewStats = {};

  const tasks: Promise<void>[] = [];

  if (canSeeSadaqah) {
    tasks.push(
      Donation.countDocuments({ status: 'pending' }).then((n) => {
        stats.pendingSadaqah = n;
      })
    );
  }
  if (canSeeGeneral) {
    tasks.push(
      ZikrRequest.countDocuments({ status: 'pending' }).then((n) => {
        stats.pendingZikrRequests = n;
      })
    );
    tasks.push(
      countOpenFeedback().then((n) => {
        stats.openFeedback = n;
      })
    );
  }
  if (isServant) {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    // Staff accounts (AdminAccount) that also signed into the app are not users.
    const notAdmin = await excludeAdminUids();
    tasks.push(
      Promise.all([
        DonationStats.findById('current'),
        User.countDocuments({ ...notAdmin, createdAt: { $gte: weekAgo } }),
        User.countDocuments(notAdmin),
        AdminAuditLog.find().sort({ createdAt: -1 }).limit(5).select('actorEmail action createdAt'),
        getUserActivity(),
      ]).then(([donationStats, newUsersThisWeek, totalUsers, recentAuditLog, activity]) => {
        stats.servant = {
          totalVerifiedAmount: donationStats?.totalVerifiedAmount ?? 0,
          newUsersThisWeek,
          totalUsers,
          recentAuditLog: recentAuditLog.map((e) => ({
            actorEmail: e.actorEmail,
            action: e.action,
            createdAt: e.createdAt,
          })),
          activity,
        };
      })
    );
  }

  await Promise.all(tasks);
  return stats;
};
