import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Audit 2026-11-16 P4-3: a toast is user-facing text, so it goes through i18n
// (en + bn) instead of being typed into the code. This is a ratchet: the files
// below still pass a literal string to toast(), each with how many. Translating
// one shrinks its number; the test fails if any file is not in the list or has
// MORE than listed, so no new hard-coded toast can slip in. When a file reaches
// 0, delete its line.

const REMAINING: Record<string, number> = {
  'App.tsx': 1,
  'components/QuranSettings.tsx': 2,
  'hooks/useSalatLog.ts': 3,
  'lib/api.ts': 2,
  'pages/Settings.tsx': 6,
};

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
  it('no file has more hard-coded toasts than the list allows, and none outside it', () => {
    expect(found).toEqual(REMAINING);
  });
});

const SECTIONS: Record<string, { file: string; keys: string[] }> = {
  'friends.toast': {
    file: 'hooks/useSocial.ts',
    keys: ['unfriendFail', 'acceptFail', 'rejectFail', 'blockFail', 'unblockFail', 'privacyFail'],
  },
  'rayhanah.toast': {
    file: 'hooks/useCycle.ts',
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
  'fasting.toast': {
    file: 'hooks/useFasting.ts',
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

describe.each(Object.entries(SECTIONS))('%s', (section, { file, keys }) => {
  it.each(keys)('%s exists in English and in Bangla script', (key) => {
    const en = at(read('en'), section)[key];
    const bn = at(read('bn'), section)[key];
    expect(en).toBeTruthy();
    expect(en).not.toContain('\u2014'); // no em dash in new copy
    expect(bn).toMatch(/[\u0980-\u09FF]/);
    expect(bn).not.toMatch(/[A-Za-z]/);
  });

  it(`${file} uses every key`, () => {
    const src = readFileSync(join(root, file), 'utf8');
    for (const key of keys) expect(src, key).toContain(`${section}.${key}`);
  });
});
