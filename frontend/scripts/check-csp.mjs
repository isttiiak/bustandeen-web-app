// Build guard for the SPA's Content-Security-Policy (audit SEC-02).
//
// The CSP in /vercel.json allow-lists the app's only inline <script> (the
// theme-before-first-paint snippet in index.html) by its sha256 hash. If that
// snippet is edited and the hash is not updated, the browser would block it
// once the policy is enforced. This check runs at the end of `npm run build`
// and fails with the exact hash to paste when the two have drifted apart.
//
// JSON-LD blocks (<script type="application/ld+json">) are data, not code,
// and are exempt from script-src, so they are skipped.
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const vercel = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'));

const csp = (vercel.headers ?? [])
  .flatMap((h) => h.headers ?? [])
  .find((h) => /^content-security-policy(-report-only)?$/i.test(h.key))?.value;

if (!csp) {
  console.error('check-csp: no Content-Security-Policy header found in vercel.json');
  process.exit(1);
}

const scriptSrc = csp
  .split(';')
  .map((d) => d.trim())
  .find((d) => d.startsWith('script-src '));

const pages = [
  'frontend/dist/index.html',
  'frontend/dist/prayer-times/dhaka-bangladesh/index.html',
  'frontend/dist/bn/duas/index.html',
].filter((p) => existsSync(join(root, p)));

const inlineScript =
  /<script(?![^>]*\bsrc=)(?![^>]*type="application\/ld\+json")[^>]*>([\s\S]*?)<\/script>/g;
const missing = new Map();

for (const page of pages) {
  const html = readFileSync(join(root, page), 'utf8');
  for (const [, body] of html.matchAll(inlineScript)) {
    const hash = `'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`;
    if (!scriptSrc?.includes(hash)) missing.set(hash, `${page}: ${body.trim().slice(0, 80)}`);
  }
}

if (missing.size > 0) {
  console.error('check-csp: inline script(s) not allow-listed in vercel.json script-src:');
  for (const [hash, where] of missing) console.error(`  ${hash}  ← ${where}`);
  console.error('Add the hash to script-src in vercel.json (or remove the inline script).');
  process.exit(1);
}

process.stdout.write(
  `check-csp: ${pages.length} page(s) checked, every inline script is allow-listed.\n`
);
