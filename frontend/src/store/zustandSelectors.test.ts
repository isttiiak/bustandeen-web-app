import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// zustand 5 (audit P3-6): a selector that builds a NEW object or array on every
// call makes React re-render forever ("Maximum update depth exceeded"; v4 only
// re-rendered quietly). Selectors here must return values already in the
// store, a primitive, or go through useShallow.

const src = fileURLToPath(new URL('../', import.meta.url));
const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? walk(join(dir, e.name))
      : /\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)
        ? [join(dir, e.name)]
        : []
  );

describe('zustand selectors', () => {
  const files = walk(src);

  it('no store hook builds a fresh object or array in its selector', () => {
    const bad: string[] = [];
    // use<Name>Store((s) => ({ ... })) or use<Name>Store((s) => [ ... ])
    const re = /use[A-Za-z]*Store\(\s*\(?\s*\w+\s*\)?\s*=>\s*(\(\s*\{|\[)/g;
    for (const f of files) {
      const text = readFileSync(f, 'utf8');
      for (const m of text.matchAll(re)) bad.push(`${f.replace(src, '')}: ${m[0]}`);
    }
    expect(bad).toEqual([]);
  });

  it('every store is created with the named `create` import (v5 has no default export)', () => {
    const offenders = files.filter((f) =>
      /import\s+create\s+from\s+'zustand'/.test(readFileSync(f, 'utf8'))
    );
    expect(offenders).toEqual([]);
  });

  it('the detector would catch the bad shape', () => {
    const re = /use[A-Za-z]*Store\(\s*\(?\s*\w+\s*\)?\s*=>\s*(\(\s*\{|\[)/;
    expect(re.test('useZikrStore((s) => ({ a: s.a }))')).toBe(true);
    expect(re.test('useZikrStore((s) => [s.a])')).toBe(true);
    expect(re.test('useZikrStore((s) => s.a)')).toBe(false);
  });
});
