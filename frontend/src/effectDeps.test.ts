import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Audit 2026-11-16 P4-5: every `exhaustive-deps` suppression says exactly WHY the
// listed dependencies are enough. 33 of them carried one boilerplate sentence
// that said nothing; each has now been read, and four were fixed by listing the
// dependencies (the values are stable, or a ref already stops a second run).
// This keeps the boilerplate out and the count from growing.

const root = fileURLToPath(new URL('.', import.meta.url));
const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [join(dir, e.name)] : []
  );

const DISABLE =
  /eslint-disable(?:-next-line|-line)?\s+react-hooks\/exhaustive-deps\s*(?:--\s*(.*))?$/;

const found = walk(root)
  .filter((f) => !/\.test\.tsx?$/.test(f))
  .flatMap((f) =>
    readFileSync(f, 'utf8')
      .split('\n')
      .map((line, i) => ({ file: f.slice(root.length), n: i + 1, m: DISABLE.exec(line) }))
      .filter((x) => x.m)
      .map((x) => ({ at: `${x.file}:${x.n}`, reason: (x.m![1] ?? '').trim() }))
  );

/** Delete from this number as suppressions are removed; never raise it. */
const MAX_SUPPRESSIONS = 29;

describe('exhaustive-deps suppressions', () => {
  it('there are no more than the reviewed number', () => {
    expect(found.length).toBeLessThanOrEqual(MAX_SUPPRESSIONS);
  });

  it('every one has a specific reason, not the old boilerplate', () => {
    const generic = found.filter(
      (f) =>
        f.reason.length < 40 ||
        /deps intentionally narrowed|omitted values are stable/.test(f.reason)
    );
    expect(generic.map((f) => f.at)).toEqual([]);
  });
});
