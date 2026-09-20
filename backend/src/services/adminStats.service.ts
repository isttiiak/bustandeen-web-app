import Donation from '../models/Donation.js';
import DonationStats from '../models/DonationStats.js';
import ZikrRequest from '../models/ZikrRequest.js';
import User from '../models/User.js';
import AdminAuditLog from '../models/AdminAuditLog.js';
import { countOpenFeedback } from './feedback.service.js';
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
  };
}

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
    tasks.push(
      Promise.all([
        DonationStats.findById('current'),
        User.countDocuments({ createdAt: { $gte: weekAgo } }),
        User.countDocuments({}),
        AdminAuditLog.find().sort({ createdAt: -1 }).limit(5).select('actorEmail action createdAt'),
      ]).then(([donationStats, newUsersThisWeek, totalUsers, recentAuditLog]) => {
        stats.servant = {
          totalVerifiedAmount: donationStats?.totalVerifiedAmount ?? 0,
          newUsersThisWeek,
          totalUsers,
          recentAuditLog: recentAuditLog.map((e) => ({
            actorEmail: e.actorEmail,
            action: e.action,
            createdAt: e.createdAt,
          })),
        };
      })
    );
  }

  await Promise.all(tasks);
  return stats;
};
