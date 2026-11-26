import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Audit 2026-11-16 P4-3: a toast is user-facing text, so it goes through i18n
// (en + bn) instead of being typed into the code. No file may pass a literal
// English string to toast(); the keys it uses must exist in both languages
// (staff-only notices are English-only on purpose, see check-i18n.mjs).

const root = fileURLToPath(new URL('.', import.meta.url));
const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [join(dir, e.name)] : []
  );

// A literal first argument, or a literal fallback after ?? or || (e.g. `msg ?? 'Could not save'`).
const LITERAL =
  /toast(\.(error|success|loading|custom))?\(\s*(['"`]|[^()'"`]*?(\?\?|\|\|)\s*['"`])/g;

const found: Record<string, number> = {};
for (const f of walk(root)) {
  if (/\.test\.tsx?$/.test(f)) continue;
  const n = (readFileSync(f, 'utf8').match(LITERAL) ?? []).length;
  if (n) found[f.slice(root.length).replace(/\\/g, '/')] = n;
}

describe('toasts go through i18n', () => {
  it('no file passes a literal English string to toast()', () => {
    expect(found).toEqual({});
  });
});

const SECTIONS: Record<string, { files: string[]; keys: string[] }> = {
  'friends.toast': {
    files: ['hooks/useSocial.ts'],
    keys: ['unfriendFail', 'acceptFail', 'rejectFail', 'blockFail', 'unblockFail', 'privacyFail'],
  },
  'rayhanah.toast': {
    files: ['hooks/useCycle.ts'],
    keys: [
      'offline',
      'saveFail',
      'updateFail',
      'settingFail',
      'pregnancyFail',
      'pastAdded',
      'pastFail',
      'noteFail',
      'editFail',
      'deleteFail',
      'bodyFail',
    ],
  },
  common: { files: ['App.tsx', 'lib/api.ts'], keys: ['accountDisabled', 'tooManyRequests'] },
  'salat.toast': { files: ['hooks/useSalatLog.ts'], keys: ['offline', 'synced'] },
  'quranSettings.toast': {
    files: ['components/QuranSettings.tsx'],
    keys: ['goalUnchanged', 'goalSet', 'goalSetPlural', 'goalRemoved', 'goalSaveFail'],
  },
  'settings.toast': {
    files: ['pages/Settings.tsx'],
    keys: [
      'reauthRequired',
      'deleteAccountFailed',
      'deleteBlockedStaff',
      'dangerDone',
      'dangerFail',
      'locationCleared',
    ],
  },
  'fasting.toast': {
    files: ['hooks/useFasting.ts'],
    keys: ['offline', 'saveFail', 'clearFail', 'profileFail', 'vowAddFail', 'vowDeleteFail'],
  },
};

const read = (lang: string) =>
  JSON.parse(
    readFileSync(join(root, `locales/${lang}/common.json`), 'utf8').replace(/^\uFEFF/, '')
  );
const at = (o: Record<string, unknown>, path: string): Record<string, string> =>
  path.split('.').reduce<unknown>((a, k) => (a as Record<string, unknown>)?.[k], o) as Record<
    string,
    string
  >;

describe.each(Object.entries(SECTIONS))('%s', (section, { files, keys }) => {
  it.each(keys)('%s exists in English and in Bangla script', (key) => {
    const en = at(read('en'), section)[key];
    const bn = at(read('bn'), section)[key];
    expect(en).toBeTruthy();
    expect(en).not.toContain('\u2014'); // no em dash in new copy
    expect(bn).toMatch(/[\u0980-\u09FF]/);
    expect(bn.replace(/\{\{[^}]*\}\}/g, '')).not.toMatch(/[A-Za-z]/); // placeholders are fine
  });

  it(`${files.join(' or ')} uses every key`, () => {
    const src = files.map((f) => readFileSync(join(root, f), 'utf8')).join('\n');
    for (const key of keys) expect(src, key).toContain(`${section}.${key}`);
  });
});

describe('staff-only notices stay English on purpose', () => {
  const KEYS = ['sessionEnded'];

  it.each(KEYS)('adminNotices.%s is English only, and the code uses it', (key) => {
    expect(at(read('en'), 'adminNotices')[key]).toBeTruthy();
    expect(read('bn').adminNotices).toBeUndefined();
    expect(readFileSync(join(root, 'lib/api.ts'), 'utf8')).toContain(`adminNotices.${key}`);
  });

  it('the i18n check lists the namespace as English-only', () => {
    const check = readFileSync(join(root, '..', 'scripts/check-i18n.mjs'), 'utf8');
    expect(check).toContain("'adminNotices'");
  });
});
