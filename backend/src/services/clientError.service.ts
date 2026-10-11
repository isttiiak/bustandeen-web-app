/**
 * Errors the app hit in visitors' browsers (frontend error reporting, no
 * third-party tracker). The browser sends one small report per distinct
 * error (utils/errorReporting.ts); this keeps a scrubbed daily count of it
 * in ClientErrorDaily for 30 days, shown in Admin, Ops health.
 *
 * Privacy: the browser already leaves out private page addresses; here the
 * message is scrubbed again (addresses → origin, emails and long numbers
 * removed) and clipped. Nothing that identifies a person or a device is
 * stored: no IP, user id, user agent or page address.
 */

import mongoose from 'mongoose';
import ClientErrorDaily, { IClientErrorDaily } from '../models/ClientErrorDaily.js';

export interface ClientErrorReport {
  kind: IClientErrorDaily['kind'];
  message: string;
  /** Path of our own bundle file, e.g. "/assets/main-DPxpfXv0.js". */
  file?: string;
  line?: number;
  route: string;
  version: string;
}

const MAX_MESSAGE = 200;
/** At most this many counter documents per UTC day (junk cannot grow it). */
export const MAX_DAILY_KEYS = 500;

/** Removes what could identify someone or something private from a message. */
export function scrubMessage(raw: string): string {
  return (
    raw
      .replace(/https?:\/\/[^\s'")]+/gi, (url) => {
        try {
          return new URL(url).origin;
        } catch {
          return '<url>';
        }
      })
      .replace(/[^\s@'"<>]+@[^\s@'"<>]+\.[a-z]{2,}/gi, '<email>')
      .replace(/\d{3,}/g, '#')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, MAX_MESSAGE) || 'unknown'
  );
}

/** "/assets/main-DPxpfXv0.js" + 12 → "main.js:12"; anything else → "unknown". */
export function whereOf(file: string | undefined, line: number | undefined): string {
  if (!file || !file.startsWith('/')) return 'unknown';
  const base = file.slice(file.lastIndexOf('/') + 1);
  const ext = base.endsWith('.mjs') ? '.mjs' : base.endsWith('.js') ? '.js' : '';
  if (!ext) return 'unknown';
  let name = base.slice(0, -ext.length);
  // Vite's content hash: "main-DPxpfXv0" → "main"
  const dash = name.lastIndexOf('-');
  if (dash > 0 && name.length - dash - 1 >= 6) name = name.slice(0, dash);
  if (!/^[\w.-]+$/.test(name)) return 'unknown';
  return `${name}${ext}${line ? `:${line}` : ''}`;
}

const counts = new Map<string, number>();
const shouldLog = (n: number) => n === 1 || Math.log10(n) % 1 === 0;

export async function recordClientError(report: ClientErrorReport, now = new Date()) {
  const key = {
    day: now.toISOString().slice(0, 10),
    kind: report.kind,
    message: scrubMessage(report.message),
    where: whereOf(report.file, report.line),
    route: report.route,
    version: report.version,
  };

  // Structured log line at 1, 10, 100… per instance, so one crash loop
  // cannot flood the logs.
  const logKey = `${key.kind}|${key.message}|${key.where}|${key.version}`;
  if (counts.has(logKey) || counts.size < 500) {
    const n = (counts.get(logKey) ?? 0) + 1;
    counts.set(logKey, n);
    if (shouldLog(n)) {
      console.warn(JSON.stringify({ level: 'warn', type: 'client-error', ...key, count: n }));
    }
  }

  if (mongoose.connection.readyState !== 1) return;
  const update = { $inc: { count: 1 }, $set: { lastSeen: now } };
  try {
    const existing = await ClientErrorDaily.updateOne(key, update);
    if (existing.matchedCount > 0) return;
    if ((await ClientErrorDaily.countDocuments({ day: key.day })) >= MAX_DAILY_KEYS) return;
    try {
      await ClientErrorDaily.updateOne(
        key,
        { ...update, $setOnInsert: { firstSeen: now } },
        { upsert: true }
      );
    } catch (err) {
      // Two instances inserting the same new key at once: retry as an increment.
      if ((err as { code?: number }).code !== 11000) throw err;
      await ClientErrorDaily.updateOne(key, update);
    }
  } catch (err) {
    // Best-effort: counting never affects the response.
    console.error('Failed to store client error count:', (err as Error).message);
  }
}

export interface ClientErrorSummary {
  kind: string;
  message: string;
  where: string;
  route: string;
  version: string;
  count: number;
  days: number;
  lastSeen: Date;
}

/** The last `days` UTC days: totals per day and the most frequent errors. */
export async function getClientErrorReport(days = 7, now = new Date()) {
  const sinceDay = new Date(now.getTime() - (days - 1) * 86_400_000).toISOString().slice(0, 10);
  const match = { $match: { day: { $gte: sinceDay } } };
  const [daily, top] = await Promise.all([
    ClientErrorDaily.aggregate<{ _id: string; count: number }>([
      match,
      { $group: { _id: '$day', count: { $sum: '$count' } } },
      { $sort: { _id: 1 } },
    ]),
    ClientErrorDaily.aggregate<{
      _id: Pick<ClientErrorSummary, 'kind' | 'message' | 'where' | 'route' | 'version'>;
      count: number;
      days: number;
      lastSeen: Date;
    }>([
      match,
      {
        $group: {
          _id: {
            kind: '$kind',
            message: '$message',
            where: '$where',
            route: '$route',
            version: '$version',
          },
          count: { $sum: '$count' },
          days: { $sum: 1 },
          lastSeen: { $max: '$lastSeen' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 50 },
    ]),
  ]);
  return {
    sinceDay,
    daily: daily.map((d) => ({ day: d._id, count: d.count })),
    top: top.map((r): ClientErrorSummary => ({
      ...r._id,
      count: r.count,
      days: r.days,
      lastSeen: r.lastSeen,
    })),
  };
}

/** Test helper. */
export function resetClientErrorCounts(): void {
  counts.clear();
}
