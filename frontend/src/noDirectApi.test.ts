import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Audit 2026-11-16 P4-4: all server data goes through hooks (hooks/), not through
// the Axios instance or fetch inside a screen. Screens may still import named
// helpers from lib/api (API_BASE, getIdToken) and use axios.isAxiosError.

const root = fileURLToPath(new URL('.', import.meta.url));
const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [join(dir, e.name)] : []
  );

// Deliberate exceptions, each with a reason.
const ALLOWED: Record<string, string> = {
  // The admin gate asks the server who the visitor is before any admin token exists.
  'components/AdminGate.tsx': 'pre-auth admin session check (axios.get)',
  // Fetches the app's own static share image to build a file for the share sheet.
  'components/ShareAppSheet.tsx': 'static OG image fetch',
};

const files = ['components', 'pages']
  .flatMap((d) => walk(join(root, d)))
  .filter((f) => !/\.test\.tsx?$/.test(f))
  .map((f) => ({ rel: f.slice(root.length).replace(/\\/g, '/'), src: readFileSync(f, 'utf8') }))
  .filter(({ rel }) => !(rel in ALLOWED));

describe('screens do not call the API themselves', () => {
  it('none imports the Axios instance (default export of lib/api)', () => {
    const offenders = files.filter(({ src }) => /^import api\b/m.test(src)).map((f) => f.rel);
    expect(offenders).toEqual([]);
  });

  it('none uses axios.get/post/put/patch/delete or fetch( directly', () => {
    const offenders = files
      .filter(({ src }) => /\baxios\.(get|post|put|patch|delete)\b|(^|[^.\w])fetch\(/m.test(src))
      .map((f) => f.rel);
    expect(offenders).toEqual([]);
  });

  it('the allow-list only names files that still need it', () => {
    for (const rel of Object.keys(ALLOWED)) {
      const src = readFileSync(join(root, rel), 'utf8');
      expect(/\baxios\.get\b|(^|[^.\w])fetch\(/m.test(src), rel).toBe(true);
    }
  });
});
