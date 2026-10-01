/**
 * Content-Security-Policy violation reports from the SPA (audit SEC-02).
 *
 * The SPA's CSP ships as Report-Only first; these reports show what the
 * policy WOULD block, so it can be tightened before it is enforced.
 *
 * Privacy: a report can contain full URLs of the page and of the blocked
 * resource. Only ORIGINS (or a keyword such as "inline") are kept, never
 * paths, query strings or script samples. Nothing is stored in the database.
 *
 * Aggregation: each warm instance logs a given (directive, blocked, source)
 * combination the first time it sees it, then again at 10, 100, 1000…
 * occurrences, so one noisy page cannot flood the logs.
 */

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

export function recordReports(body: unknown): void {
  for (const v of parseReports(body)) {
    const key = `${v.directive}|${v.blocked}|${v.source}|${v.disposition}`;
    if (!counts.has(key) && counts.size >= MAX_KEYS) continue;
    const count = (counts.get(key) ?? 0) + 1;
    counts.set(key, count);
    if (shouldLog(count)) {
      console.warn(JSON.stringify({ level: 'warn', type: 'csp-violation', ...v, count }));
    }
  }
}

/** Test helper. */
export function resetCounts(): void {
  counts.clear();
}
