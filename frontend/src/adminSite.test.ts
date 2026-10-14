import { afterEach, describe, expect, it, vi } from 'vitest';
import vercel from '../../vercel.json';
import adminEntry from './admin-entry.tsx?raw';
import adminHtml from '../admin.html?raw';
import routes from './routes.tsx?raw';
import routeGuards from './routeGuards.tsx?raw';
import adminRoutes from './adminRoutes.tsx?raw';
import adminFirebase from './adminFirebase.ts?raw';
import sw from './sw.ts?raw';
import { adminUrl, publicSiteUrl } from './utils/siteLinks.js';
import { retireAdminSession } from './utils/retireAdminSession.js';

// v5.163.0: the admin panel is its own site (admin.html on
// admin.bustandeen.com): origin isolation from the app.

type Rule = {
  source: string;
  destination: string;
  has?: { type: string; value: string }[];
  missing?: { type: string; value: string }[];
};
type HeaderBlock = Omit<Rule, 'destination'> & { headers: { key: string; value: string }[] };
const v = vercel as unknown as { redirects: Rule[]; rewrites: Rule[]; headers: HeaderBlock[] };
const onHost = (r: { has?: Rule['has'] }, host: string) =>
  (r.has ?? []).some((c) => c.type === 'host' && c.value === host);

describe('admin site', () => {
  it('the app no longer contains the admin panel', () => {
    expect(routes).not.toMatch(/pages\/Admin|AdminProtected/);
    expect(routes).toContain('<Route path="/admin/*" element={<AdminRedirect />} />');
    expect(routeGuards).not.toMatch(/AdminGate|AdminLayout|useAdminStore/);
    expect(adminRoutes.match(/<AdminProtected>/g)).toHaveLength(12);
  });

  it('the admin page has no app Firebase, service worker, analytics or saved cache', () => {
    for (const banned of [
      'pwaUpdate',
      'initAnalytics',
      "'./firebase.js'",
      'PersistQueryClientProvider',
      'idbCache',
      'demoRestoreBoot',
    ])
      expect(adminEntry, banned).not.toContain(banned);
    expect(adminHtml).not.toMatch(/<script(?![^>]*\bsrc=)/); // no inline script
    expect(adminHtml).not.toMatch(/rel="manifest"/);
    expect(adminHtml).toContain('noindex');
    // Email and password only: no popup helper, so no Firebase auth iframe.
    expect(adminFirebase).toMatch(
      /initializeAuth\(adminApp, \{ persistence: browserLocalPersistence \}\)/
    );
    expect(adminFirebase).not.toContain('getAuth(');
    // The app's worker never answers /admin.
    expect(sw).toContain('/^\\/admin(\\/|\\?|$)/');
  });

  it('vercel.json sends bustandeen.com/admin to the admin site and keeps it admin-only', () => {
    const main = v.redirects.filter(
      (r) => onHost(r, 'bustandeen.com') && r.source.startsWith('/admin')
    );
    expect(main.map((r) => [r.source, r.destination])).toEqual([
      ['/admin', 'https://admin.bustandeen.com/admin'],
      ['/admin/:path*', 'https://admin.bustandeen.com/admin/:path*'],
    ]);
    const admin = v.redirects.filter((r) => onHost(r, 'admin.bustandeen.com'));
    expect(admin[0]).toMatchObject({ source: '/', destination: '/admin' });
    const away = new RegExp(`^${admin[1]!.source.replace('/(', '/(?:')}$`);
    for (const path of ['/salat', '/login', '/admin.html', '/sw.js']) expect(path).toMatch(away);
    for (const path of ['/admin', '/admin/users', '/api/admin/auth/session', '/assets/x.js'])
      expect(path).not.toMatch(away);
    // Served before the app-shell catch-all (previews and local dev use these).
    const i = v.rewrites.findIndex((r) => r.destination === '/admin.html');
    expect(i).toBeGreaterThan(-1);
    expect(i).toBeLessThan(v.rewrites.findIndex((r) => r.destination === '/app-shell.html'));
  });

  it('the admin site has its own strict headers; the app keeps its own', () => {
    const app = v.headers[0]!;
    expect(app.missing).toContainEqual({ type: 'host', value: 'admin.bustandeen.com' });
    const admin = v.headers.find((h) => onHost(h, 'admin.bustandeen.com'))!;
    const get = (k: string) => admin.headers.find((h) => h.key === k)?.value ?? '';
    const csp = get('Content-Security-Policy');
    expect(csp).toContain("script-src 'self';");
    expect(csp).toContain("frame-src 'none'");
    expect(csp).toContain("worker-src 'none'");
    expect(csp).not.toMatch(/googletagmanager|google-analytics|alquran|nominatim/);
    expect(get('X-Robots-Tag')).toBe('noindex, nofollow');
    expect(get('Permissions-Policy')).toMatch(/^geolocation=\(\)/);
  });

  it('links between the two sites', () => {
    expect(adminUrl('/admin/users', 'bustandeen.com')).toBe(
      'https://admin.bustandeen.com/admin/users'
    );
    expect(adminUrl('/admin', 'www.bustandeen.com')).toBe('https://admin.bustandeen.com/admin');
    expect(adminUrl('/admin', 'localhost')).toBe('/admin');
    expect(adminUrl('/admin', 'bustandeenvercel-x-isttiiak-projects.vercel.app')).toBe('/admin');
    expect(publicSiteUrl('admin.bustandeen.com')).toBe('https://bustandeen.com/');
    expect(publicSiteUrl('localhost')).toBe('/');
  });
});

describe('the old admin sign-in on bustandeen.com is removed once', () => {
  afterEach(() => vi.unstubAllGlobals());

  const fakeStorage = (init: Record<string, string>) => {
    const store = new Map(Object.entries(init));
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, val: string) => void store.set(k, val),
      removeItem: (k: string) => void store.delete(k),
    });
    return store;
  };

  it('removes only the admin sign-in and proof, on the production host', () => {
    const store = fakeStorage({
      'firebase:authUser:KEY:admin': '{}',
      'firebase:authUser:KEY:[DEFAULT]': '{}',
      bustandeen_admin_mfa: 'proof',
      bustandeen_idToken: 't',
    });
    retireAdminSession('KEY', 'bustandeen.com');
    expect([...store.keys()].sort()).toEqual([
      'bustandeen_admin_moved',
      'bustandeen_idToken',
      'firebase:authUser:KEY:[DEFAULT]',
    ]);
    // Once: a later admin sign-in here (none should exist) is not touched again.
    store.set('bustandeen_admin_mfa', 'later');
    retireAdminSession('KEY', 'bustandeen.com');
    expect(store.get('bustandeen_admin_mfa')).toBe('later');
  });

  it('leaves previews and local dev alone (the panel shares their host)', () => {
    const store = fakeStorage({ bustandeen_admin_mfa: 'proof' });
    retireAdminSession('KEY', 'localhost');
    retireAdminSession('KEY', 'admin.bustandeen.com');
    expect(store.get('bustandeen_admin_mfa')).toBe('proof');
  });
});
