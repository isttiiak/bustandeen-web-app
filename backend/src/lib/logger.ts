import { createHmac } from 'node:crypto';
import { createRequire } from 'node:module';
import type { Request } from 'express';

/**
 * Structured server-error logging for production (audit BE-01).
 *
 * One JSON line per 5xx on stderr, which Vercel keeps in its function logs
 * (searchable by `"level":"error"` or by route). By design it NEVER contains:
 *   - request bodies (worship logs, cycle data, notes),
 *   - query strings or raw URLs with ids (the route PATTERN is logged instead,
 *     e.g. /api/admin/users/:uid),
 *   - a raw uid: the uid is replaced by a keyed hash, stable enough to tell
 *     "one user hitting this 20 times" from "20 users", useless to anyone
 *     without the server key.
 */

const MAX_MESSAGE = 500;
const MAX_STACK_LINES = 8;

function readVersion(): string {
  try {
    // A literal require() so Vercel's file tracing bundles package.json.
    const pkg = createRequire(import.meta.url)('../../package.json') as { version?: string };
    return pkg.version ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

const RELEASE = [readVersion(), process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7)]
  .filter(Boolean)
  .join('+');

/** Keyed hash of a uid. The key is derived from FIELD_ENCRYPTION_KEY (with a
 * fixed context label, so the hash can't be used against the encryption), or
 * LOG_HASH_KEY when set. With neither, the uid is dropped entirely. */
export function hashUid(uid: string | undefined): string | undefined {
  if (!uid) return undefined;
  const secret = process.env.LOG_HASH_KEY ?? process.env.FIELD_ENCRYPTION_KEY;
  if (!secret) return undefined;
  const key = createHmac('sha256', secret).update('bustandeen:log-uid:v1').digest();
  return createHmac('sha256', key).update(uid).digest('hex').slice(0, 16);
}

/** The matched route pattern (/api/salat/:date), never the concrete URL. An
 * error thrown before routing (no match yet) falls back to the path with
 * id-looking segments masked. */
export function routeOf(req: Request): string {
  const pattern = (req.route as { path?: unknown } | undefined)?.path;
  if (typeof pattern === 'string') return `${req.baseUrl}${pattern}`;
  return (req.originalUrl ?? req.url ?? '')
    .split('?')[0]
    .split('/')
    .map((seg) => (/\d/.test(seg) || seg.length > 24 ? ':id' : seg))
    .join('/');
}

export interface ServerErrorLog {
  level: 'error';
  ts: string;
  release: string;
  method: string;
  route: string;
  status: number;
  uid?: string;
  errName: string;
  message: string;
  stack?: string[];
}

export function buildServerErrorLog(err: Error, req: Request, status: number): ServerErrorLog {
  return {
    level: 'error',
    ts: new Date().toISOString(),
    release: RELEASE,
    method: req.method,
    route: routeOf(req),
    status,
    uid: hashUid(req.user?.uid),
    errName: err.name || 'Error',
    message: String(err.message ?? '').slice(0, MAX_MESSAGE),
    stack: err.stack
      ?.split('\n')
      .slice(1, MAX_STACK_LINES + 1)
      .map((l) => l.trim()),
  };
}

export function logServerError(err: Error, req: Request, status: number): void {
  try {
    console.error(JSON.stringify(buildServerErrorLog(err, req, status)));
  } catch {
    // Logging must never turn one failure into two.
  }
}
