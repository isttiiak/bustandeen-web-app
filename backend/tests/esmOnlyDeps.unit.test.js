import fs from 'node:fs';
import path from 'node:path';

// Vercel's Node loader does not support require() of an ES module, even on
// Node versions that do locally. v5.97.0's dependency bump (#123) pulled in
// he 2.0.0 (ESM-only) under mailparser, which require()s it: every /api call
// crashed with ERR_REQUIRE_ESM in production while tests here passed.
// This guard fails when a CommonJS production package depends on an
// ESM-only package. Fix with an npm "overrides" pin (see "he" in package.json).

const root = path.resolve(import.meta.dirname, '..');
const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));

const readPkg = (rel) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, rel, 'package.json'), 'utf8'));
  } catch {
    return null;
  }
};

// A "type": "module" package is loadable by require() only through a
// "require" export condition or a .cjs entry.
const isEsmOnly = (pkg) => {
  if (!pkg || pkg.type !== 'module') return false;
  const entries = JSON.stringify(pkg.exports ?? pkg.main ?? '');
  return !entries.includes('"require"') && !entries.includes('.cjs');
};

// Node's lookup: <pkgDir>/node_modules/<dep>, then each ancestor node_modules.
const resolveDep = (pkgPath, dep) => {
  let dir = pkgPath;
  for (;;) {
    const candidate = `${dir}/node_modules/${dep}`;
    if (lock.packages[candidate]) return candidate;
    const idx = dir.lastIndexOf('/node_modules/');
    if (idx === -1) break;
    dir = dir.slice(0, idx);
  }
  return lock.packages[`node_modules/${dep}`] ? `node_modules/${dep}` : null;
};

// A CommonJS package may reach an ESM-only one through a dynamic import(),
// which Node and Vercel both support. Each entry names the files that load
// the dependency; the test below fails if any of them require()s it.
const DYNAMIC_IMPORT_ONLY = {
  // firebase-admin 13.10 -> google-auth-library 10 -> gaxios 7: node-fetch 3
  // is loaded only by `await import('node-fetch')` (build/cjs/src/gaxios.js).
  'node_modules/firebase-admin/node_modules/gaxios -> node_modules/firebase-admin/node_modules/node-fetch':
    { dir: 'node_modules/firebase-admin/node_modules/gaxios/build/cjs', dep: 'node-fetch' },
};

const jsFiles = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? jsFiles(p) : e.name.endsWith('.js') ? [p] : [];
  });

test.each(Object.entries(DYNAMIC_IMPORT_ONLY))(
  '%s is loaded only by a dynamic import()',
  (_edge, { dir, dep }) => {
    const sources = jsFiles(path.join(root, dir)).map((f) => fs.readFileSync(f, 'utf8'));
    const requireDep = new RegExp(String.raw`require\(\s*['"]${dep}['"]\s*\)`);
    expect(sources.some((src) => src.includes(`import('${dep}')`))).toBe(true);
    expect(sources.filter((src) => requireDep.test(src))).toEqual([]);
  }
);

test('no CommonJS production dependency requires an ESM-only package', () => {
  const offenders = [];
  for (const [pkgPath, meta] of Object.entries(lock.packages)) {
    if (!pkgPath.startsWith('node_modules/') || meta.dev || meta.optional) continue;
    const pkg = readPkg(pkgPath);
    if (!pkg || pkg.type === 'module') continue;
    for (const dep of Object.keys(pkg.dependencies ?? {})) {
      const depPath = resolveDep(pkgPath, dep);
      const edge = `${pkgPath} -> ${depPath}`;
      if (depPath && isEsmOnly(readPkg(depPath)) && !DYNAMIC_IMPORT_ONLY[edge])
        offenders.push(edge);
    }
  }
  expect(offenders).toEqual([]);
});
