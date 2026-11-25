import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Audit 2026-11-16 P3-7: docs/README.md is the architecture reference. It said
// v5.61.0 and described several things that had since changed. This keeps the
// claims that went stale from coming back, and keeps the things a new
// contributor needs (the guards and the environments) written down.

const repoFile = (rel: string): string =>
  readFileSync(fileURLToPath(new URL(`../../${rel}`, import.meta.url)), 'utf8');

const docs = repoFile('docs/README.md');

describe('docs/README.md', () => {
  it('names a "last verified" version and no longer claims v5.61.0', () => {
    expect(docs).toMatch(/Last verified against the code: \d{4}-\d{2}-\d{2} \(v5\.\d+\.\d+\)/);
    expect(docs).not.toContain('v5.61.0');
  });

  it.each([
    ['autoIndex: true is on', 'indexes now come from sync-indexes; autoIndex is off outside tests'],
    [
      'in-memory store**, which is\nper serverless instance (audit SEC-01)',
      'money limits use the Mongo store',
    ],
    ['ihsan-web-app-main', 'previews are matched by utils/corsOrigins.ts'],
    ['stays on v12', 'firebase-admin is on v13'],
    ['no outbox yet', 'syncOutbox covers fasting, Quran, cycle, adhkar and zikr'],
    ['gets `index.html`', 'the navigation fallback is app-shell.html'],
    ['no TTL** on', 'RateLimitHit and EmailFailureLog have TTLs'],
  ])('does not say "%s" (%s)', (stale) => {
    expect(docs).not.toContain(stale);
  });

  it('describes the current environments, guards and CI', () => {
    for (const phrase of [
      'app-shell.html',
      'sync-indexes',
      '--production',
      'npm run migrate',
      'PRODUCTION_MONGO_HOST',
      'bustandeen-staging',
      'main` is protected',
      'CodeQL',
    ]) {
      expect(docs, phrase).toContain(phrase);
    }
  });

  it('lists every model as a collection', () => {
    const models = [
      'User',
      'ZikrEvent',
      'SalatLog',
      'CycleDay',
      'ClientOp',
      'RateLimitCounter',
      'CronRun',
      'AdminSetting',
      'MoonSighting',
      'PendingSignup',
      'CspViolationDaily',
      'ClientErrorDaily',
      'AdhkarDay',
      'DailyActivity',
    ];
    for (const m of models) expect(docs, m).toContain('`' + m + '`');
  });
});

describe('design prototypes', () => {
  it('track the Ramadan print-sheet prototype but not its generated PDFs and PNGs', () => {
    expect(repoFile('.gitignore')).toMatch(/^docs\/design\/ramadan-print-sheet\/$/m);
    expect(repoFile('docs/design/ramadan-print-sheet.html')).toContain(
      '<title>Ramadan Print Sheet</title>'
    );
  });
});
