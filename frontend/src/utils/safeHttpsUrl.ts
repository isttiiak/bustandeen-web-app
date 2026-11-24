/**
 * Source links come from people (a suggestion, an admin edit, a user's own zikr
 * note) and end up in an href. Only a plain https address may become a link:
 * `javascript:`, `data:`, `http:` and the rest are refused (audit 2026-11-16 P2-7).
 * Mirrors backend/src/validation/httpsUrl.ts.
 */
export function safeHttpsUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  // eslint-disable-next-line no-control-regex -- refusing control characters is the point
  if (!value || /[\u0000- \u007f]/.test(value)) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || !url.hostname) return null;
    return value;
  } catch {
    return null;
  }
}
