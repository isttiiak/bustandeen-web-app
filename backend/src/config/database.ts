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
 * stopped. Every hosted cluster counts as production here, the staging one
 * included: a write there needs --production too.
 */
export function assertWriteAllowed(uri: string, apply: boolean, argv: readonly string[]): void {
  if (!apply || isLocalMongoUri(uri) || argv.includes('--production')) return;
  throw new Error(
    `Refusing to write to "${mongoHost(uri)}": it is not a local database. ` +
      'Run it against a local MongoDB, or add --production if you mean to change the live data ' +
      '(read the dry run first).'
  );
}

/** Cluster identity of a host: Atlas shard hosts and the SRV name share everything after the first label. */
function clusterKey(host: string): string {
  const h = host.replace(/:\d+$/, '').trim().toLowerCase();
  return h.endsWith('.mongodb.net') ? h.split('.').slice(1).join('.') : h;
}

/**
 * A Vercel preview deploy must never run on the production database (audit
 * 2026-11-16 P3-1). On a preview, MONGODB_URI is the staging cluster, and
 * PRODUCTION_MONGO_HOST (the production host only, no credentials, set for the
 * Preview scope too) is what it is checked against. Production deploys and
 * local development are not affected. It fails closed: a preview without
 * PRODUCTION_MONGO_HOST cannot prove it is not production, so it does not start.
 */
export function assertNotProductionOnPreview(
  uri: string,
  env: Readonly<Record<string, string | undefined>> = process.env
): void {
  const vercelEnv = env.VERCEL_ENV;
  if (!vercelEnv || vercelEnv === 'production') return;

  const production = (env.PRODUCTION_MONGO_HOST ?? '')
    .split(',')
    .map((h) => mongoHost(h.trim()))
    .filter(Boolean)
    .map(clusterKey);
  if (production.length === 0) {
    throw new Error(
      `Refusing to start a ${vercelEnv} deploy: PRODUCTION_MONGO_HOST is not set, so it cannot be ` +
        'shown that MONGODB_URI is not the production database. Set it (host only) for the Preview scope.'
    );
  }
  const hosts = mongoHost(uri).split(',');
  if (hosts.some((h) => production.includes(clusterKey(h)))) {
    throw new Error(
      `Refusing to start a ${vercelEnv} deploy on "${mongoHost(uri)}": that is the production database. ` +
        'Point MONGODB_URI at the staging cluster for the Preview scope.'
    );
  }
}
