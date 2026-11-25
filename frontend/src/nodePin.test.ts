import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Audit P3-8: the prerendered prayer-time pages take their timezone rules from
// the tz data bundled with Node, and seo/nonBdSsr.test.ts holds a snapshot of
// those pages. The exact Node version must therefore be the same wherever the
// tests run: CI (ci.yml), the other workflow that installs Node, and the
// version `nvm use` gives a developer (.nvmrc). Raise all of them together
// with the snapshot, after checking which cities and dates moved.

const repoFile = (rel: string): string =>
  readFileSync(fileURLToPath(new URL(`../../${rel}`, import.meta.url)), 'utf8');

const EXACT = /^\d+\.\d+\.\d+$/;

describe('Node version pin', () => {
  const ci = /NODE_VERSION:\s*'([^']+)'/.exec(repoFile('.github/workflows/ci.yml'))?.[1];

  it('CI pins an exact Node version', () => {
    expect(ci).toMatch(EXACT);
  });

  it('.nvmrc is the same exact version as CI', () => {
    expect(repoFile('.nvmrc').trim()).toBe(ci);
  });

  it('every other workflow that installs Node uses it too', () => {
    const rules = repoFile('.github/workflows/storage-rules.yml');
    const versions = [...rules.matchAll(/node-version:\s*'?([^'\s]+)'?/g)].map((m) => m[1]);
    expect(versions.length).toBeGreaterThan(0);
    for (const v of versions) expect(v).toBe(ci);
  });
});
