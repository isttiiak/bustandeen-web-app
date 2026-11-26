import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Audit 2026-11-16 P4-5: `npm run knip` lists unused files, exports and
// dependencies (report only, not in CI yet). Its entry points must be real files,
// or the report would call live code unused.

const repo = fileURLToPath(new URL('../../', import.meta.url));
const read = (rel: string): string =>
  readFileSync(join(repo, rel), 'utf8').replace(String.fromCharCode(0xfeff), '');

describe('knip', () => {
  const root = JSON.parse(read('package.json'));

  it('is a root dev dependency with report-only scripts', () => {
    expect(root.devDependencies.knip).toBeTruthy();
    expect(root.scripts.knip).toContain('knip:frontend');
    expect(root.scripts.knip).toContain('knip:backend');
    for (const s of ['knip:frontend', 'knip:backend']) {
      expect(root.scripts[s], s).toContain('--no-exit-code'); // never fails a build
    }
  });

  it('the frontend is clean, so CI checks it (and a new unused export fails the build)', () => {
    expect(root.scripts['knip:frontend:check']).toBeTruthy();
    expect(root.scripts['knip:frontend:check']).not.toContain('--no-exit-code');
    expect(read('.github/workflows/ci.yml')).toContain('npm run knip:frontend:check');
  });

  it('only three files are excused from the unused-exports check, on purpose', () => {
    // salat/calculation modules: their unused names are kept (documented defaults and helpers)
    expect(Object.keys(JSON.parse(read('frontend/knip.json')).ignoreIssues ?? {}).sort()).toEqual([
      'src/hooks/useSalatLog.ts',
      'src/seo/utils/calc.ts',
      'src/utils/salatPrefs.ts',
    ]);
  });

  it.each(['frontend', 'backend'])('%s/knip.json names entry files that exist', (pkg) => {
    const cfg = JSON.parse(read(`${pkg}/knip.json`));
    const literal = (cfg.entry as string[]).filter((e) => !/[*{]/.test(e));
    expect(literal.length).toBeGreaterThan(0);
    for (const e of literal) expect(existsSync(join(repo, pkg, e)), `${pkg}/${e}`).toBe(true);
  });

  it('the frontend config lists every bundle entry the build starts from', () => {
    const entries = JSON.parse(read('frontend/knip.json')).entry as string[];
    for (const e of ['src/main.tsx', 'src/admin-entry.tsx', 'src/static-entry.ts', 'src/sw.ts']) {
      expect(entries).toContain(e);
    }
  });
});
