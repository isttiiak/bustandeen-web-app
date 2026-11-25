import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DB_NAME, assertWriteAllowed, isLocalMongoUri, mongoHost } from '../src/config/database.js';

// Audit 2026-11-16 P3-1 / P3-2: one database name, and a write script never
// reaches a hosted database unless the operator typed --production.

const ATLAS = 'mongodb+srv://user:secret@cluster0.abcde.mongodb.net/ihsan?retryWrites=true';

describe('mongoHost / isLocalMongoUri', () => {
  it('names the host without credentials, scheme or path', () => {
    expect(mongoHost(ATLAS)).toBe('cluster0.abcde.mongodb.net');
    expect(mongoHost('mongodb://u:p@127.0.0.1:27017/x')).toBe('127.0.0.1:27017');
  });

  it.each([
    'mongodb://127.0.0.1:27017/',
    'mongodb://localhost/ihsan',
    'mongodb://[::1]:27017',
    'mongodb://localhost:27017,127.0.0.1:27018/?replicaSet=rs',
  ])('%s is local', (uri) => {
    expect(isLocalMongoUri(uri)).toBe(true);
  });

  it.each([
    ATLAS,
    'mongodb://shard-00.abcde.mongodb.net:27017/',
    'mongodb://localhost:27017,evil.example.com:27017/',
    'mongodb+srv://localhost/',
    // credentials that merely contain a local-looking word are not the host
    'mongodb://localhost:pw@cluster0.abcde.mongodb.net/',
  ])('%s is not local', (uri) => {
    expect(isLocalMongoUri(uri)).toBe(false);
  });
});

describe('assertWriteAllowed', () => {
  it('refuses a write to a hosted database without --production', () => {
    expect(() => assertWriteAllowed(ATLAS, true, ['--apply'])).toThrow(/cluster0\.abcde/);
    expect(() => assertWriteAllowed(ATLAS, true, ['--apply'])).toThrow(/--production/);
  });

  it('never prints the credentials', () => {
    try {
      assertWriteAllowed(ATLAS, true, []);
    } catch (e) {
      expect(String(e.message)).not.toMatch(/secret|user:/);
    }
  });

  it('allows the write with --production', () => {
    expect(() => assertWriteAllowed(ATLAS, true, ['--apply', '--production'])).not.toThrow();
  });

  it('never stops a dry run or a read-only report', () => {
    expect(() => assertWriteAllowed(ATLAS, false, [])).not.toThrow();
  });

  it('allows a write to a local database', () => {
    expect(() => assertWriteAllowed('mongodb://127.0.0.1:27017/', true, ['--apply'])).not.toThrow();
  });
});

describe('the source', () => {
  const srcDir = join(process.cwd(), 'src');
  const walk = (dir) =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.ts') ? [join(dir, e.name)] : []
    );
  const files = walk(srcDir);

  it('names the database in one place only', () => {
    expect(DB_NAME).toBe('ihsan'); // the live name; see CLAUDE.md "Deferred Migrations"
    const offenders = files.filter(
      (f) =>
        !f.endsWith(join('config', 'database.ts')) && /dbName:\s*['"]/.test(readFileSync(f, 'utf8'))
    );
    expect(offenders).toEqual([]);
  });

  it('every operator script that can write checks the target first', () => {
    const scripts = files.filter(
      (f) => f.includes(join('src', 'scripts')) && !f.includes(join('scripts', 'lib'))
    );
    const writers = scripts.filter((f) =>
      /process\.argv\.includes\('--apply'\)/.test(readFileSync(f, 'utf8'))
    );
    expect(writers.length).toBeGreaterThanOrEqual(7);
    const unguarded = writers.filter(
      (f) => !/assertWriteAllowed|connectScript/.test(readFileSync(f, 'utf8'))
    );
    expect(unguarded).toEqual([]);
  });
});
