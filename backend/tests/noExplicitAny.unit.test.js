import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Audit 2026-11-16 P4-5: backend source is typed without `any`. The ESLint rule
// allows an inline escape hatch with a reason; this test is stricter and keeps
// the escape hatches from coming back one by one.

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.ts') ? [join(dir, e.name)] : []
  );
const files = walk(join(process.cwd(), 'src')).filter((f) => !f.endsWith('.d.ts'));

const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('backend source', () => {
  it('has no `any` types', () => {
    const offenders = files.flatMap((f) =>
      stripComments(readFileSync(f, 'utf8'))
        .split('\n')
        .map((line, i) => ({ f, line, n: i + 1 }))
        .filter(({ line }) =>
          /:\s*any\b|\bas any\b|<any>|\bany\[\]|Record<string,\s*any>/.test(line)
        )
        .map(({ f: file, n, line }) => `${file}:${n}: ${line.trim()}`)
    );
    expect(offenders).toEqual([]);
  });

  it('has no eslint-disable for no-explicit-any', () => {
    const offenders = files.filter((f) => /no-explicit-any/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
