import { analyticsPath } from './analytics.js';
import { isChunkLoadError } from './staleChunkReload.js';

/**
 * Frontend error reporting without a third-party tracker (audit T1.1
 * follow-up). Uncaught errors, unhandled promise rejections and render
 * crashes (ErrorBoundary) are sent once each to our own
 * POST /api/client-errors, which keeps a scrubbed daily count for 30 days
 * (Admin, Ops health).
 *
 * What is sent: the error kind and message, our own bundle file and line, the
 * analytics-redacted page pattern ("/private" for private areas) and the app
 * version. Never an account, device id, page address or what the user logged.
 *
 * Not reported: errors from other origins (browser extensions, injected
 * scripts), a missing chunk after a deploy (staleChunkReload handles it), API
 * errors (the server logs those) and anything in development.
 */

export type ClientErrorKind = 'error' | 'rejection' | 'render';

export interface ClientErrorPayload {
  kind: ClientErrorKind;
  message: string;
  file?: string;
  line?: number;
  route: string;
  version: string;
}

const MAX_PER_PAGE_LOAD = 10;
const seen = new Set<string>();
let sent = 0;

const IGNORED_MESSAGES = [
  /^ResizeObserver loop/i,
  /^Script error\.?$/i, // opaque cross-origin error, nothing to learn
  /^AbortError/i,
  /The user aborted a request/i,
];

function messageOf(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error)?.slice(0, 300) ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

/** The first stack frame in one of our own files: { file: "/assets/x.js", line }. */
export function ownFrame(
  stack: string | undefined,
  origin: string
): { file: string; line: number } | null {
  if (!stack) return null;
  for (const m of stack.matchAll(/(https?:\/\/[^\s()]+?):(\d+):\d+/g)) {
    try {
      const url = new URL(m[1]);
      if (url.origin === origin) return { file: url.pathname, line: Number(m[2]) };
    } catch {
      /* not a URL */
    }
  }
  return null;
}

/** Builds the report, or null when this error should not be sent. Exported for tests. */
export function buildReport(
  error: unknown,
  kind: ClientErrorKind,
  ctx: { origin: string; pathname: string; version: string; filename?: string; lineno?: number }
): ClientErrorPayload | null {
  if (isChunkLoadError(error)) return null;
  if ((error as { isAxiosError?: boolean } | null)?.isAxiosError) return null;
  const message = messageOf(error);
  if (IGNORED_MESSAGES.some((re) => re.test(message))) return null;

  const stack = error instanceof Error ? error.stack : undefined;
  let frame = ownFrame(stack, ctx.origin);
  if (!frame && ctx.filename) {
    // window.onerror without an Error object: only our own files count.
    try {
      const url = new URL(ctx.filename);
      if (url.origin === ctx.origin) frame = { file: url.pathname, line: ctx.lineno ?? 0 };
    } catch {
      /* ignore */
    }
  }
  // An error thrown entirely outside our code (an extension, an injected
  // script) has no frame of ours: not our bug.
  if (!frame && (stack || ctx.filename)) return null;

  return {
    kind,
    message: message.slice(0, 1000),
    ...(frame && /^\/[\w./-]*$/.test(frame.file) ? { file: frame.file, line: frame.line } : {}),
    route: analyticsPath(ctx.pathname) ?? '/private',
    version: ctx.version,
  };
}

function send(payload: ClientErrorPayload, apiBase: string): void {
  const key = `${payload.kind}|${payload.message}|${payload.file ?? ''}|${payload.line ?? ''}`;
  if (seen.has(key) || sent >= MAX_PER_PAGE_LOAD) return;
  seen.add(key);
  sent += 1;
  const url = `${apiBase}/api/client-errors`;
  const body = JSON.stringify(payload);
  try {
    // text/plain keeps sendBeacon a "simple" request (no CORS preflight).
    if (navigator.sendBeacon?.(url, new Blob([body], { type: 'text/plain' }))) return;
  } catch {
    /* fall back to fetch */
  }
  void fetch(url, {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'text/plain' },
    keepalive: true,
  }).catch(() => {});
}

let apiBaseUrl = '';

/** Reports one error (also used by ErrorBoundary for render crashes). */
export function reportClientError(
  error: unknown,
  kind: ClientErrorKind,
  extra: { filename?: string; lineno?: number } = {}
): void {
  if (import.meta.env.DEV || typeof window === 'undefined') return;
  try {
    const payload = buildReport(error, kind, {
      origin: window.location.origin,
      pathname: window.location.pathname,
      version: __APP_VERSION__,
      ...extra,
    });
    if (payload) send(payload, apiBaseUrl);
  } catch {
    /* reporting must never throw */
  }
}

/** Listens for uncaught errors and unhandled rejections (production only). */
export function initErrorReporting(apiBase: string): void {
  if (import.meta.env.DEV || typeof window === 'undefined') return;
  apiBaseUrl = apiBase;
  window.addEventListener('error', (e) => {
    // Resource load failures (an <img>) bubble here without an error object.
    if (!e.error && !e.message) return;
    reportClientError(e.error ?? e.message, 'error', { filename: e.filename, lineno: e.lineno });
  });
  window.addEventListener('unhandledrejection', (e) => reportClientError(e.reason, 'rejection'));
}

/** Test helper. */
export function resetErrorReporting(): void {
  seen.clear();
  sent = 0;
}
