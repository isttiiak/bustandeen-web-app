import { z } from 'zod';

/**
 * A web link that may be shown to other people as a clickable "source": https only.
 * `z.string().url()` accepts any scheme (javascript:, data:, ftp:), so it is not enough.
 * Also refused: whitespace and control characters (the URL parser quietly strips tabs and
 * newlines), and addresses carrying a user name or password.
 */
function isHttpsUrl(value: string): boolean {
  // eslint-disable-next-line no-control-regex -- refusing control characters is the point
  if (/[\u0000- \u007f]/.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && url.hostname.length > 0;
  } catch {
    return false;
  }
}

export const httpsUrl = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine(isHttpsUrl, { message: 'The link must be a web address starting with https://' });
