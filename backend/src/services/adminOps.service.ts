import mongoose from 'mongoose';
import EmailFailureLog from '../models/EmailFailureLog.js';
import RateLimitHit from '../models/RateLimitHit.js';
import { isFirebaseInitialized } from '../config/firebaseAdmin.js';
import type { EmailSender } from './email.service.js';

const SENDERS: EmailSender[] = ['sadaqah', 'ansar', 'istiak'];

/** Whether each named sender has usable SMTP credentials configured — never
 *  returns the credential values themselves, just a boolean per sender.
 *  Mirrors resolveSenderCreds's env-var lookup in email.service.ts without
 *  exporting that internal helper. */
const senderConfigured = (sender: EmailSender): boolean => {
  const dedicated =
    sender === 'sadaqah'
      ? ['SADAQAH_SMTP_USER', 'SADAQAH_SMTP_PASS']
      : sender === 'ansar'
        ? ['ANSAR_SMTP_USER', 'ANSAR_SMTP_PASS']
        : null;
  if (dedicated && process.env[dedicated[0]] && process.env[dedicated[1]]) return true;
  const fallbackUser = sender === 'istiak' ? 'ISTIAK_SMTP_USER' : 'ZOHO_SMTP_USER';
  const fallbackPass = sender === 'istiak' ? 'ISTIAK_SMTP_PASS' : 'ZOHO_SMTP_PASS';
  return !!(
    process.env.ZOHO_SMTP_HOST &&
    process.env.ZOHO_SMTP_PORT &&
    process.env[fallbackUser] &&
    process.env[fallbackPass]
  );
};

export interface OpsHealth {
  emailSendersConfigured: Record<EmailSender, boolean>;
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

  const emailSendersConfigured = Object.fromEntries(
    SENDERS.map((s) => [s, senderConfigured(s)])
  ) as Record<EmailSender, boolean>;

  return {
    emailSendersConfigured,
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
