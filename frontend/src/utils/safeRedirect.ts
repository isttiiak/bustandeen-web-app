/**
 * Post-sign-in redirects are read back out of sessionStorage, so they must be
 * treated as untrusted before being handed to navigate().
 *
 * Everything we WRITE is internal (location.pathname, '/zikr', `/connect/:code`
 * …), but sessionStorage is writable by anything running on the origin, and
 * react-router ≤7.17 had an open-redirect where a BACKSLASH slips past a naive
 * "starts with /" check (CVE-2025-68470 bypass, GHSA-wrjc-x8rr-h8h6). Requiring
 * a single leading slash followed by a character that is neither / nor \ closes
 * `//evil.com`, `/\evil.com` and `\\evil.com` at our own choke point, which
 * holds whichever router version is installed. Control characters are refused
 * too: the URL parser strips tabs and newlines, so `/\t/evil.com` would
 * otherwise collapse into `//evil.com`.
 */
export function safeRedirect(raw: string | null | undefined): string {
  if (!raw) return '/';
  if (!/^\/(?![/\\])/.test(raw)) return '/';
  // eslint-disable-next-line no-control-regex -- matching control characters is the point
  if (/[\u0000-\u001f\u007f]/.test(raw)) return '/';
  return raw;
}
