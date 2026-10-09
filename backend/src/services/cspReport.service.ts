/**
 * Content-Security-Policy violation reports from the SPA (audit SEC-02).
 *
 * The SPA's CSP ships as Report-Only first; these reports show what the
 * policy WOULD block, so it can be tightened before it is enforced.
 *
 * Privacy: a report can contain full URLs of the page and of the blocked
 * resource. Only ORIGINS (or a keyword such as "inline") are kept, never
 * paths, query strings or script samples. Daily counts per (directive,
 * blocked origin, source origin) are kept in CspViolationDaily for 30 days
 * (Vercel Hobby keeps only one hour of logs, too little to review a week
 * before enforcing); no IP, user id or page address is stored with them.
 *
 * Aggregation: each warm instance logs a given (directive, blocked, source)
 * combination the first time it sees it, then again at 10, 100, 1000…
 * occurrences, so one noisy page cannot flood the logs.
 */

import mongoose from 'mongoose';
import CspViolationDaily from '../models/CspViolationDaily.js';

export interface CspViolation {
  directive: string;
  blocked: string;
  source: string;
  disposition: string;
}

const MAX_KEYS = 500;
const counts = new Map<string, number>();

type Json = Record<string, unknown>;

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

/** "https://cdn.example.com/x.js?y" → "https://cdn.example.com";
 *  "inline" / "eval" / "data" / "blob" stay keywords. */
export function originOnly(value: string): string {
  if (!value) return 'unknown';
  if (/^(inline|eval|wasm-eval|trusted-types-policy|trusted-types-sink)$/.test(value)) return value;
  if (/^(data|blob|about|chrome-extension|moz-extension|safari-extension):?/i.test(value)) {
    return value.split(':')[0].toLowerCase();
  }
  try {
    return new URL(value).origin;
  } catch {
    return 'other';
  }
}

function fromLegacy(r: Json): CspViolation {
  return {
    directive:
      str(r['effective-directive']) || str(r['violated-directive']).split(' ')[0] || 'unknown',
    blocked: originOnly(str(r['blocked-uri'])),
    source: originOnly(str(r['source-file'])),
    disposition: str(r.disposition) || 'report',
  };
}

function fromReportingApi(b: Json): CspViolation {
  return {
    directive: str(b.effectiveDirective) || 'unknown',
    blocked: originOnly(str(b.blockedURL)),
    source: originOnly(str(b.sourceFile)),
    disposition: str(b.disposition) || 'report',
  };
}

/** Accepts both formats browsers send: the legacy `report-uri` body
 *  (`{"csp-report": {...}}`) and the Reporting API batch (`[{type, body}]`). */
export function parseReports(body: unknown): CspViolation[] {
  if (Array.isArray(body)) {
    return body
      .filter(
        (r): r is Json => !!r && typeof r === 'object' && (r as Json).type === 'csp-violation'
      )
      .map((r) => fromReportingApi(((r.body as Json) ?? {}) as Json))
      .slice(0, 20);
  }
  if (body && typeof body === 'object' && (body as Json)['csp-report']) {
    return [fromLegacy((body as Json)['csp-report'] as Json)];
  }
  return [];
}

function shouldLog(count: number): boolean {
  return count === 1 || Math.log10(count) % 1 === 0;
}

/** At most this many counter documents per UTC day: junk reports with
 *  made-up origins cannot grow the collection without bound. */
export const MAX_DAILY_KEYS = 500;
const MAX_FIELD_LENGTH = 200;

const clip = (s: string) => s.slice(0, MAX_FIELD_LENGTH);

/** Adds the reports to today's (UTC) counters. Skipped when MongoDB is not
 *  connected, so a report never waits on a buffered query. */
export async function persistDailyCounts(violations: CspViolation[], now = new Date()) {
  if (violations.length === 0 || mongoose.connection.readyState !== 1) return;
  const day = now.toISOString().slice(0, 10);
  for (const v of violations) {
    const key = {
      day,
      directive: clip(v.directive),
      blocked: clip(v.blocked),
      source: clip(v.source),
      disposition: clip(v.disposition),
    };
    const update = { $inc: { count: 1 }, $set: { lastSeen: now } };
    const existing = await CspViolationDaily.updateOne(key, update);
    if (existing.matchedCount > 0) continue;
    if ((await CspViolationDaily.countDocuments({ day })) >= MAX_DAILY_KEYS) continue;
    try {
      await CspViolationDaily.updateOne(
        key,
        { ...update, $setOnInsert: { firstSeen: now } },
        { upsert: true }
      );
    } catch (err) {
      // Two instances inserting the same new key at once: the loser retries as an increment.
      if ((err as { code?: number }).code !== 11000) throw err;
      await CspViolationDaily.updateOne(key, update);
    }
  }
}

export interface CspViolationSummary {
  directive: string;
  blocked: string;
  source: string;
  disposition: string;
  count: number;
  days: number;
  lastSeen: Date;
}

export interface CspViolationReport {
  sinceDay: string;
  daily: { day: string; count: number }[];
  top: CspViolationSummary[];
}

/** The last `days` UTC days (today included): totals per day and the most
 *  frequent combinations, for Admin Ops Health. */
export async function getViolationReport(days = 7, now = new Date()): Promise<CspViolationReport> {
  const since = new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  const sinceDay = since.toISOString().slice(0, 10);
  const match = { $match: { day: { $gte: sinceDay } } };
  const [daily, top] = await Promise.all([
    CspViolationDaily.aggregate<{ _id: string; count: number }>([
      match,
      { $group: { _id: '$day', count: { $sum: '$count' } } },
      { $sort: { _id: 1 } },
    ]),
    CspViolationDaily.aggregate<{
      _id: { directive: string; blocked: string; source: string; disposition: string };
      count: number;
      days: number;
      lastSeen: Date;
    }>([
      match,
      {
        $group: {
          _id: {
            directive: '$directive',
            blocked: '$blocked',
            source: '$source',
            disposition: '$disposition',
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
    top: top.map((r) => ({ ...r._id, count: r.count, days: r.days, lastSeen: r.lastSeen })),
  };
}

export async function recordReports(body: unknown): Promise<void> {
  const violations = parseReports(body);
  for (const v of violations) {
    const key = `${v.directive}|${v.blocked}|${v.source}|${v.disposition}`;
    if (!counts.has(key) && counts.size >= MAX_KEYS) continue;
    const count = (counts.get(key) ?? 0) + 1;
    counts.set(key, count);
    if (shouldLog(count)) {
      console.warn(JSON.stringify({ level: 'warn', type: 'csp-violation', ...v, count }));
    }
  }
  try {
    await persistDailyCounts(violations);
  } catch (err) {
    // Best-effort: a counting failure never affects the 204.
    console.error('Failed to store CSP violation counts:', (err as Error).message);
  }
}

/** Test helper. */
export function resetCounts(): void {
  counts.clear();
}
