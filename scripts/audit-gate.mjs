#!/usr/bin/env node
// CI gate: `npm audit` of the production dependencies in the current
// directory, failing on any high or critical advisory except the ones below.
//
// An exception is for an advisory that cannot be fixed yet and does not reach
// our code. Each one names the only package path it may come through, why it
// is safe, and a review date: after that date the gate fails again, so the
// exception is looked at instead of forgotten.

import { execFileSync } from 'node:child_process';

// None open. The last one (GHSA-86w9-cpqp-85rv, node-forge via firebase-admin
// 12) ended with firebase-admin 13.10, which no longer uses node-forge.
// Shape: { advisory: 'GHSA-…', via: ['pkg', …], reason: '…', reviewBy: 'YYYY-MM-DD' }
/** @type {{ advisory: string, via: string[], reason: string, reviewBy: string }[]} */
const EXCEPTIONS = [];

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
