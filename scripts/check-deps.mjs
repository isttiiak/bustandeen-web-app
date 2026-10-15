// Are the installed packages the ones package-lock.json pins? (2026-10-16)
//
// Pulling a merge that bumped dependencies (Dependabot, a Vite major) leaves
// node_modules on the old versions until someone runs `npm ci`. Nothing failed
// loudly: on 2026-10-16 this PC still had Vite 7 a week after the move to
// Vite 8 (#287), so the static entry was missing from the build, and the
// backend tests ran against an older Express, Mongoose and Zod than CI and
// production. This check compares every top-level package in each lockfile
// with what is installed and names the command that fixes it.
//
//   node scripts/check-deps.mjs                 root, backend and frontend
//   node scripts/check-deps.mjs frontend        one workspace
//   node scripts/check-deps.mjs --warn          report only, never fail (git hooks)
//
// It runs before `npm run dev` and the workspaces' tests, and after a pull or
// a branch switch (.husky/post-merge, .husky/post-checkout). Fix: `npm run sync-deps`
// (also fetches the backend tests' MongoDB binary, which npm 11 may skip).
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const warnOnly = args.includes('--warn');
const named = args.filter((a) => !a.startsWith('--'));
const workspaces = named.length ? named : ['.', 'backend', 'frontend'];

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

/** Top-level packages a workspace's lockfile pins that are missing or differ. */
export function mismatches(dir) {
  const lockPath = join(dir, 'package-lock.json');
  if (!existsSync(lockPath)) return [];
  const lock = readJson(lockPath);
  const out = [];
  for (const [key, entry] of Object.entries(lock.packages ?? {})) {
    // Only top-level node_modules/<name> (and node_modules/@scope/name).
    const name = key.startsWith('node_modules/') ? key.slice('node_modules/'.length) : null;
    if (!name || name.includes('/node_modules/') || entry.link) continue;
    // Optional packages for other platforms (e.g. @rolldown/binding-linux-*) are never installed here.
    if (entry.optional || entry.devOptional === false) continue;
    const pkg = join(dir, key, 'package.json');
    if (!existsSync(pkg)) {
      if (entry.os || entry.cpu) continue;
      out.push(`${name}: missing (lockfile ${entry.version})`);
      continue;
    }
    const installed = readJson(pkg).version;
    if (installed !== entry.version)
      out.push(`${name}: ${installed} installed, lockfile ${entry.version}`);
  }
  return out;
}

let bad = 0;
for (const ws of workspaces) {
  const dir = join(root, ws);
  const list = mismatches(dir);
  if (!list.length) continue;
  bad += list.length;
  const label = ws === '.' ? 'root' : ws;
  console.error(`\ncheck-deps: ${label} node_modules does not match its package-lock.json:`);
  for (const line of list.slice(0, 15)) console.error(`  ${line}`);
  if (list.length > 15) console.error(`  ... and ${list.length - 15} more`);
}

if (bad) {
  console.error('\nFix: npm run sync-deps   (npm ci in the root, backend and frontend)\n');
  if (!warnOnly) process.exit(1);
}
