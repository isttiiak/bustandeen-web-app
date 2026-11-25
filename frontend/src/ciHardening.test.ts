import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Audit P3-4: the repository is public and its workflows run on every pull
// request. Least privilege, pinned actions and bounded runs are checked here so
// a later edit cannot quietly undo them.

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = (rel: string): string => readFileSync(root + rel, 'utf8');
const workflowFiles = readdirSync(root + '.github/workflows').filter((f) => f.endsWith('.yml'));

describe('workflows', () => {
  it('there are workflows to check', () => {
    expect(workflowFiles).toEqual(
      expect.arrayContaining(['ci.yml', 'codeql.yml', 'gitleaks.yml', 'storage-rules.yml'])
    );
  });

  it.each(workflowFiles)('%s sets its token permissions', (f) => {
    expect(read(`.github/workflows/${f}`)).toMatch(/^permissions:/m);
  });

  it.each(workflowFiles)('%s pins every action to a full commit SHA', (f) => {
    const uses = [...read(`.github/workflows/${f}`).matchAll(/^\s*-?\s*uses:\s*(\S+)/gm)].map(
      (m) => m[1]!
    );
    for (const u of uses) expect(u).toMatch(/@[0-9a-f]{40}$/);
  });

  it.each(workflowFiles)('%s gives every job a timeout', (f) => {
    const text = read(`.github/workflows/${f}`);
    const jobs = (text.match(/^ {4}runs-on:/gm) ?? []).length;
    const timeouts = (text.match(/^ {4}timeout-minutes:/gm) ?? []).length;
    expect(jobs).toBeGreaterThan(0);
    expect(timeouts).toBe(jobs);
  });

  it.each(workflowFiles)('%s does not leave the checkout token in the workspace', (f) => {
    const text = read(`.github/workflows/${f}`);
    const checkouts = (text.match(/actions\/checkout@/g) ?? []).length;
    const safe = (text.match(/persist-credentials: false/g) ?? []).length;
    expect(safe).toBe(checkouts);
  });

  it('CI cancels a superseded pull-request run, never one on main', () => {
    const ci = read('.github/workflows/ci.yml');
    expect(ci).toMatch(/^concurrency:/m);
    expect(ci).toContain("cancel-in-progress: ${{ github.event_name == 'pull_request' }}");
  });

  it('CodeQL covers the code and the workflows', () => {
    const q = read('.github/workflows/codeql.yml');
    expect(q).toContain('javascript-typescript');
    expect(q).toMatch(/language: \[[^\]]*\bactions\b/);
  });
});

describe('Dependabot', () => {
  const d = read('.github/dependabot.yml');
  it('updates the workflows and the firebase tests', () => {
    expect(d).toMatch(/package-ecosystem: 'github-actions'/);
    expect(d).toMatch(/package-ecosystem: 'npm'\s+directory: '\/firebase'/);
  });
});

describe('the Vercel function entry (api/index.ts)', () => {
  it('is linted and typechecked with everything else', () => {
    const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> };
    expect(pkg.scripts.lint).toContain('lint:api');
    expect(pkg.scripts.typecheck).toContain('typecheck:api');
    expect(existsSync(root + 'api/tsconfig.json')).toBe(true);
    expect(read('api/tsconfig.json')).toContain('index.ts');
  });
});

describe('Vercel install', () => {
  it('installs exactly what the lockfiles pin (npm ci, not npm install)', () => {
    const cfg = JSON.parse(read('vercel.json')) as { installCommand: string };
    expect(cfg.installCommand).not.toMatch(/npm install/);
    expect(cfg.installCommand).toContain('npm ci --prefix backend');
    expect(cfg.installCommand).toContain('npm ci --prefix frontend');
  });
});

describe('backend dev tooling', () => {
  it('does not carry nodemon (the dev server is `tsx watch`)', () => {
    const pkg = JSON.parse(read('backend/package.json')) as {
      scripts: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    expect(pkg.devDependencies).not.toHaveProperty('nodemon');
    expect(pkg.scripts.dev).toContain('tsx watch');
    expect(read('backend/package-lock.json')).not.toContain('"node_modules/nodemon"');
  });
});
