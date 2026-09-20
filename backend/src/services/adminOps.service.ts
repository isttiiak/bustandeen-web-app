import mongoose from 'mongoose';
import EmailFailureLog from '../models/EmailFailureLog.js';
import RateLimitHit from '../models/RateLimitHit.js';
import { isFirebaseInitialized } from '../config/firebaseAdmin.js';
import { getSenderDiagnostics, EmailSender, SenderDiagnostics } from './email.service.js';

const SENDERS: EmailSender[] = ['sadaqah', 'ansar', 'istiak'];

export interface OpsHealth {
  emailSenders: Record<EmailSender, SenderDiagnostics>;
  /** Senders that resolve to the identical mailbox address — each sender has
   *  its own dedicated env-var pair now, so this should only ever be
   *  non-empty if two pairs were mistakenly set to the same address. Each
   *  entry is the shared address plus which senders collide on it. */
  senderCollisions: { resolvedUser: string; senders: EmailSender[] }[];
  recentEmailFailures: {
    sender: string;
    to: string;
    subject: string;
    error: string;
    createdAt: Date;
  }[];
  mongoConnected: boolean;
  firebaseInitialized: boolean;
}

export const getOpsHealth = async (): Promise<OpsHealth> => {
  const recentEmailFailures = await EmailFailureLog.find()
    .sort({ createdAt: -1 })
    .limit(20)
    .select('sender to subject error createdAt');

  const diagnostics = SENDERS.map((s) => [s, getSenderDiagnostics(s)] as const);
  const emailSenders = Object.fromEntries(diagnostics) as Record<EmailSender, SenderDiagnostics>;

  const byAddress = new Map<string, EmailSender[]>();
  for (const [s, diag] of diagnostics) {
    const addr = diag.resolvedUser;
    if (!addr) continue;
    byAddress.set(addr, [...(byAddress.get(addr) ?? []), s]);
  }
  const senderCollisions = [...byAddress.entries()]
    .filter(([, senders]) => senders.length > 1)
    .map(([resolvedUser, senders]) => ({ resolvedUser, senders }));

  return {
    emailSenders,
    senderCollisions,
    recentEmailFailures,
    mongoConnected: mongoose.connection.readyState === 1,
    firebaseInitialized: isFirebaseInitialized(),
  };
};

export interface RateLimitHitSummary {
  limiterName: string;
  path: string;
  count: number;
  lastHit: Date;
}

/** Aggregated over the last 24h, grouped by limiter+path — a raw event list
 *  would be noisy under any real abuse; this shows what's actually being hit. */
export const getRateLimitSummary = async (): Promise<RateLimitHitSummary[]> => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const rows = await RateLimitHit.aggregate<{
    _id: { limiterName: string; path: string };
    count: number;
    lastHit: Date;
  }>([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: { limiterName: '$limiterName', path: '$path' },
        count: { $sum: 1 },
        lastHit: { $max: '$createdAt' },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 50 },
  ]);
  return rows.map((r) => ({
    limiterName: r._id.limiterName,
    path: r._id.path,
    count: r.count,
    lastHit: r.lastHit,
  }));
};
