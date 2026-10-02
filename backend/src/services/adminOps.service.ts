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

/** Atlas M0 caps a free cluster at 512 MB of uncompressed BSON plus index
 *  bytes (not the compressed `storageSize` on disk). */
export const M0_STORAGE_CAP_BYTES = 512 * 1024 * 1024;
export const STORAGE_WARN_RATIO = 0.7;

/** True once usage reaches 70% of the cap. */
export const isStorageNearCap = (totalBytes: number, capBytes = M0_STORAGE_CAP_BYTES): boolean =>
  totalBytes / capBytes >= STORAGE_WARN_RATIO;

export interface CollectionSize {
  name: string;
  documents: number;
  dataBytes: number;
  indexBytes: number;
  totalBytes: number;
}

export interface StorageUsage {
  collections: CollectionSize[];
  dataBytes: number;
  indexBytes: number;
  totalBytes: number;
  capBytes: number;
  usedRatio: number;
  warn: boolean;
}

/** Read-only size metadata from `$collStats`; never reads or writes documents.
 *  Counts this database only (the app has no other database on the cluster). */
export const getStorageUsage = async (): Promise<StorageUsage> => {
  const db = mongoose.connection.db;
  if (!db) throw new Error('MongoDB is not connected');

  // Views and system collections have no storage of their own.
  const names = (await db.listCollections({ type: 'collection' }, { nameOnly: true }).toArray())
    .map((c) => c.name)
    .filter((n) => !n.startsWith('system.'));

  const collections = await Promise.all(
    names.map(async (name): Promise<CollectionSize> => {
      const [stats] = await db
        .collection(name)
        .aggregate<{
          storageStats: { count: number; size: number; totalIndexSize: number };
        }>([{ $collStats: { storageStats: {} } }])
        .toArray();
      const s = stats?.storageStats;
      const dataBytes = s?.size ?? 0;
      const indexBytes = s?.totalIndexSize ?? 0;
      return {
        name,
        documents: s?.count ?? 0,
        dataBytes,
        indexBytes,
        totalBytes: dataBytes + indexBytes,
      };
    })
  );
  collections.sort((a, b) => b.totalBytes - a.totalBytes);

  const dataBytes = collections.reduce((sum, c) => sum + c.dataBytes, 0);
  const indexBytes = collections.reduce((sum, c) => sum + c.indexBytes, 0);
  const totalBytes = dataBytes + indexBytes;

  return {
    collections,
    dataBytes,
    indexBytes,
    totalBytes,
    capBytes: M0_STORAGE_CAP_BYTES,
    usedRatio: totalBytes / M0_STORAGE_CAP_BYTES,
    warn: isStorageNearCap(totalBytes),
  };
};
