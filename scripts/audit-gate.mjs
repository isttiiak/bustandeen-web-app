#!/usr/bin/env node
// CI gate: `npm audit` of the production dependencies in the current
// directory, failing on any high or critical advisory except the ones below.
//
// An exception is for an advisory that cannot be fixed yet and does not reach
// our code. Each one names the only package path it may come through, why it
// is safe, and a review date: after that date the gate fails again, so the
// exception is looked at instead of forgotten.

import { execFileSync } from 'node:child_process';

const EXCEPTIONS = [
  {
    advisory: 'GHSA-86w9-cpqp-85rv',
    // node-forge <= 1.4.0 (every release): RSA PKCS#1 v1.5 signature
    // verification accepts extra nested DigestAlgorithm elements.
    via: ['firebase-admin', 'node-forge'],
    reason:
      'firebase-admin 12 calls node-forge only to parse our own service-account key ' +
      '(pki.privateKeyFromPem, app/credential-internal.js); it never verifies a ' +
      'signature with it. The fix is firebase-admin 14, which crashed the Vercel ' +
      'function on 2026-09-20 (see .github/dependabot.yml).',
    reviewBy: '2026-11-01',
  },
];

const SEVERE = new Set(['high', 'critical']);
const today = new Date().toISOString().slice(0, 10);

let report;
try {
  report = execFileSync('npm', ['audit', '--omit=dev', '--json'], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
} catch (err) {
  // npm audit exits 1 when it finds anything; the JSON is still on stdout.
  report = err.stdout;
}

let vulns;
try {
  vulns = JSON.parse(report).vulnerabilities ?? {};
} catch {
  console.error('npm audit did not return JSON (registry unreachable?).');
  process.exit(2);
}

/** Advisory ids (GHSA-…) behind one package's entry, following `via` links. */
function advisoriesOf(name, seen = new Set()) {
  if (seen.has(name)) return [];
  seen.add(name);
  const v = vulns[name];
  if (!v) return [];
  return v.via.flatMap((x) =>
    typeof x === 'string' ? advisoriesOf(x, seen) : [x.url.split('/').pop()]
  );
}

const failures = [];
const excused = new Set();
for (const [name, v] of Object.entries(vulns)) {
  if (!SEVERE.has(v.severity)) continue;
  for (const id of advisoriesOf(name)) {
    const ex = EXCEPTIONS.find((e) => e.advisory === id && e.via.includes(name));
    if (!ex) failures.push(`${name}: ${id} (${v.severity})`);
    else if (today > ex.reviewBy)
      failures.push(`${name}: ${id} exception expired on ${ex.reviewBy}, review it`);
    else excused.add(`${id} via ${name} (review by ${ex.reviewBy}): ${ex.reason}`);
  }
}

for (const line of excused) console.warn(`Allowed: ${line}`);
if (failures.length) {
  console.error(`High or critical advisories:\n  ${[...new Set(failures)].join('\n  ')}`);
  process.exit(1);
}
console.warn('No unexcused high or critical advisories.');
