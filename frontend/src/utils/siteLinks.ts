/** Live uptime page (Better Stack, on our own subdomain). It is an ordinary
 *  link: nothing loads from it until someone opens it. */
export const STATUS_URL = 'https://status.bustandeen.com';

/** Help & Updates (bayan.bustandeen.com): guides, what's new, how we calculate. */
export const HELP_URL = 'https://bayan.bustandeen.com/home';
export const HELP_URL_BN = 'https://bayan.bustandeen.com/bn/home';

/** The production app and the admin panel's own site (v5.163.0, origin
 *  isolation: the panel's sign-in never shares storage with the app's). */
export const MAIN_HOST = 'bustandeen.com';
export const MAIN_ORIGIN = `https://${MAIN_HOST}`;
export const ADMIN_ORIGIN = 'https://admin.bustandeen.com';

/** Where an /admin path opens from this host: the admin site in production,
 *  the same host elsewhere (previews and local dev serve admin.html at /admin). */
export function adminUrl(path: string, host = window.location.hostname): string {
  return host === MAIN_HOST || host === `www.${MAIN_HOST}` ? `${ADMIN_ORIGIN}${path}` : path;
}

/** The public site, seen from the admin panel. */
export function publicSiteUrl(host = window.location.hostname): string {
  return host.startsWith('admin.') ? `${MAIN_ORIGIN}/` : '/';
}
