import { createHmac } from 'node:crypto';
import { createRequire } from 'node:module';
import type { Request, RequestHandler } from 'express';

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

/**
 * One line per FAILED request (status 400 and up), replacing morgan('combined')
 * (audit P2-2). It carries the method, the route pattern, the status and the
 * time taken, and nothing else: no URL or query string (receipt signatures,
 * ids), no IP address, no browser string, no uid. Successful requests are not
 * logged here (the host keeps its own request log), nor are CORS preflights and
 * the health checks, which monitors call every minute.
 */
export function requestLogger(): RequestHandler {
  return (req, res, next) => {
    const started = process.hrtime.bigint();
    // The route is read when the headers go out: once the response has finished, Express has
    // unwound its routers and req.baseUrl is empty again, which would drop the /api/... prefix.
    let route = '';
    const writeHead = res.writeHead.bind(res) as (...args: unknown[]) => typeof res;
    res.writeHead = ((...args: unknown[]) => {
      if (!route) route = routeOf(req);
      return writeHead(...args);
    }) as typeof res.writeHead;
    res.on('finish', () => {
      try {
        if (res.statusCode < 400) return;
        if (req.method === 'OPTIONS') return;
        const path = req.originalUrl.split('?')[0];
        if (path === '/api/health' || path.startsWith('/api/health/')) return;
        console.warn(
          JSON.stringify({
            tag: 'http',
            ts: new Date().toISOString(),
            method: req.method,
            route: route || routeOf(req),
            status: res.statusCode,
            ms: Math.round(Number(process.hrtime.bigint() - started) / 1e6),
          })
        );
      } catch {
        // Logging must never break a response.
      }
    });
    next();
  };
}
