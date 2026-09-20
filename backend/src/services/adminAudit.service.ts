import AdminAuditLog from '../models/AdminAuditLog.js';
import type { AdminRole } from '../models/AdminAccount.js';

/**
 * Awaited by every caller (never fire-and-forget — Vercel can freeze a
 * serverless function right after the response is sent, same reasoning as
 * `sendMail`), but a logging failure must never fail the underlying admin
 * action it's recording — the action itself already succeeded by the time
 * this runs.
 */
export const logAdminAction = async (params: {
  actorEmail: string;
  actorRole: AdminRole;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> => {
  try {
    await AdminAuditLog.create(params);
  } catch (err) {
    console.error('Failed to write admin audit log:', err);
  }
};

export interface AuditLogListResult {
  entries: InstanceType<typeof AdminAuditLog>[];
  total: number;
  page: number;
  limit: number;
}

export const listAuditLog = async (
  actorEmail: string | undefined,
  page: number,
  limit: number
): Promise<AuditLogListResult> => {
  const filter = actorEmail ? { actorEmail } : {};
  const [entries, total] = await Promise.all([
    AdminAuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    AdminAuditLog.countDocuments(filter),
  ]);
  return { entries, total, page, limit };
};
