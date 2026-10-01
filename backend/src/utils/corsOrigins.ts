/**
 * Vercel preview origins the API accepts cross-origin (audit SEC-05).
 *
 * Preview hosts look like
 *   https://<base>-<hash>-<owner>.vercel.app          (deploy preview)
 *   https://<base>-git-<branch>-<owner>.vercel.app    (branch preview)
 *   https://<base>.vercel.app                         (the project's own domain)
 * where <owner> is the Vercel account/team slug. Only that account can mint
 * hosts ending in its slug, which is what makes the match safe.
 *
 * Both parts come from the environment, so a project rename no longer needs a
 * code change:
 *   VERCEL_PREVIEW_BASES  comma-separated project slugs
 *   VERCEL_PREVIEW_OWNER  the account/team slug, with or without the leading "-"
 * The defaults keep the pre-rename slug working during the transition (remove
 * `ihsan-web-app-main` once nothing points at it).
 *
 * Previews call their own /api same-origin, so this matters only for
 * cross-origin use (e.g. a preview frontend against another deployment's API).
 * Auth is a Bearer token, never a cookie, so an accepted origin still cannot
 * act for a user without that user's token.
 */
export const DEFAULT_PREVIEW_BASES = [
  'bustandeenvercel',
  'bustandeenvercelapp',
  'ihsan-web-app-main',
];
export const DEFAULT_PREVIEW_OWNER = 'isttiiak-projects';

export interface PreviewMatcherConfig {
  bases: string[];
  owner: string;
}

export function previewConfigFromEnv(env: NodeJS.ProcessEnv = process.env): PreviewMatcherConfig {
  const bases = (env.VERCEL_PREVIEW_BASES ?? '')
    .split(',')
    .map((b) => b.trim().toLowerCase())
    .filter((b) => /^[a-z0-9][a-z0-9-]*$/.test(b));
  const owner = (env.VERCEL_PREVIEW_OWNER ?? '').trim().toLowerCase().replace(/^-/, '');
  return {
    bases: bases.length ? bases : DEFAULT_PREVIEW_BASES,
    owner: /^[a-z0-9][a-z0-9-]*$/.test(owner) ? owner : DEFAULT_PREVIEW_OWNER,
  };
}

export function isVercelPreviewOrigin(origin: string, config: PreviewMatcherConfig): boolean {
  const scheme = 'https://';
  const domain = '.vercel.app';
  const o = origin.toLowerCase();
  if (!o.startsWith(scheme) || !o.endsWith(domain)) return false;
  const host = o.slice(scheme.length, o.length - domain.length);
  const ownerSuffix = `-${config.owner}`;

  for (const base of config.bases) {
    if (host === base) return true;
    if (!host.startsWith(`${base}-`) || !host.endsWith(ownerSuffix)) continue;
    let slug = host.slice(base.length + 1, host.length - ownerSuffix.length);
    if (slug.startsWith('git-')) slug = slug.slice(4);
    if (/^[a-z0-9][a-z0-9-]*$/.test(slug)) return true;
  }
  return false;
}
