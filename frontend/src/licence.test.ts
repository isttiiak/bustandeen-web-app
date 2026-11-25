import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Audit 2026-11-16 P3-3: the public repository says what it is licensed under,
// publishes its security policy, and the repo-facing docs do not point at
// local-only files (CLAUDE.md, TODO lists) that a reader cannot open.

const repoFile = (rel: string): string =>
  readFileSync(fileURLToPath(new URL(`../../${rel}`, import.meta.url)), 'utf8');

describe('licence', () => {
  it('LICENSE is the MIT text with a copyright line', () => {
    const text = repoFile('LICENSE');
    expect(text).toMatch(/^MIT License\n\nCopyright \(c\) \d{4} \S/);
    expect(text).toContain('THE SOFTWARE IS PROVIDED "AS IS"');
  });

  it.each(['package.json', 'frontend/package.json', 'backend/package.json'])(
    '%s declares MIT',
    (file) => {
      expect(JSON.parse(repoFile(file)).license).toBe('MIT');
    }
  );

  it('the README links the licence and the notice', () => {
    const readme = repoFile('README.md');
    expect(readme).toContain('[MIT](LICENSE)');
    expect(readme).toContain('(NOTICE)');
  });

  it('NOTICE keeps the Tanzil terms and reserves the name and logos', () => {
    const notice = repoFile('NOTICE');
    expect(notice).toContain('https://tanzil.net');
    expect(notice).toMatch(/verbatim/i);
    expect(notice).toMatch(/all rights reserved/i);
  });
});

describe('repo-facing docs', () => {
  it('SECURITY.md is un-ignored, so the policy is published', () => {
    expect(repoFile('.gitignore')).toMatch(/^!SECURITY\.md$/m);
    expect(repoFile('SECURITY.md')).toContain('Reporting a Vulnerability');
  });

  it.each(['README.md', 'backend/README.md', 'docs/README.md'])(
    '%s does not point readers at local-only files',
    (file) => {
      expect(repoFile(file)).not.toMatch(/CLAUDE\.md|TODO-v3|TODO-AUDIT/);
    }
  );
});
