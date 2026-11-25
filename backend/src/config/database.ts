/**
 * The one place that names the database, and the rule every write script
 * follows (audit 2026-11-16 P3-1 / P3-2).
 *
 * `DB_NAME` is 'ihsan' on purpose: the live Atlas database was created under
 * the old name and renaming it needs a dump, a restore and downtime (see
 * CLAUDE.md "Deferred Migrations"). Do not change it here without that plan.
 */
export const DB_NAME = 'ihsan';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '0.0.0.0']);

/** Host list of a Mongo connection string, without credentials, scheme or path. */
export function mongoHost(uri: string): string {
  return uri
    .replace(/^mongodb(\+srv)?:\/\//, '')
    .replace(/^[^@/]*@/, '')
    .split(/[/?]/)[0]!;
}

/** True only when every host in the string is this machine. */
export function isLocalMongoUri(uri: string): boolean {
  if (/^mongodb\+srv:\/\//.test(uri)) return false; // SRV records only point at hosted clusters
  const hosts = mongoHost(uri)
    .split(',')
    .map((h) => h.replace(/:\d+$/, '').toLowerCase());
  return hosts.length > 0 && hosts.every((h) => LOCAL_HOSTS.has(h));
}

/**
 * Throws when a script that WRITES is pointed at a hosted database without
 * `--production` on the command line. Dry runs and read-only reports are never
 * stopped. There is no staging database yet, so for now every Atlas cluster
 * counts as production.
 */
export function assertWriteAllowed(uri: string, apply: boolean, argv: readonly string[]): void {
  if (!apply || isLocalMongoUri(uri) || argv.includes('--production')) return;
  throw new Error(
    `Refusing to write to "${mongoHost(uri)}": it is not a local database. ` +
      'Run it against a local MongoDB, or add --production if you mean to change the live data ' +
      '(read the dry run first).'
  );
}
