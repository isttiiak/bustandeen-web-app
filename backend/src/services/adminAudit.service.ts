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

/** The audit log's area filter: which action prefixes each area covers. */
export const AUDIT_AREAS = {
  sadaqah: ['donation', 'expense', 'quarterly', 'donor'],
  zikr: ['zikrRequest', 'library'],
  users: ['user'],
  accounts: ['account'],
  messages: ['feedback', 'mailbox', 'email'],
  broadcast: ['announcement', 'moonSighting'],
} as const;

export type AuditArea = keyof typeof AUDIT_AREAS;

export const isAuditArea = (v: unknown): v is AuditArea =>
  typeof v === 'string' && Object.hasOwn(AUDIT_AREAS, v);

export const listAuditLog = async (
  filter: { actorEmail?: string; area?: AuditArea },
  page: number,
  limit: number
): Promise<AuditLogListResult> => {
  const query: Record<string, unknown> = {};
  // Stored lower-case (AdminAccount.email is lowercase), so match that way.
  if (filter.actorEmail) query.actorEmail = filter.actorEmail.toLowerCase();
  // Built only from the fixed AUDIT_AREAS list, never from request text.
  if (filter.area) query.action = { $regex: `^(${AUDIT_AREAS[filter.area].join('|')})\\.` };
  const [entries, total] = await Promise.all([
    AdminAuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    AdminAuditLog.countDocuments(query),
  ]);
  return { entries, total, page, limit };
};
