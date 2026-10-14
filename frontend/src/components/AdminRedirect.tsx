import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { adminUrl } from '../utils/siteLinks.js';

/**
 * /admin inside the main app (v5.163.0). The admin panel is its own page
 * (admin.html), on its own site in production, so this only ever runs after a
 * link inside the app (the Navbar's "Admin Panel", an admin password reset) or
 * when an older service worker answered /admin with the app shell. A full page
 * load hands it to the server, which serves the panel (or, on bustandeen.com,
 * the admin site). If the same path comes back here within a few seconds, the
 * panel page is not being served, so this shows a plain link instead of looping.
 */
const KEY = 'bustandeen_admin_redirect';

export default function AdminRedirect() {
  const { pathname, search } = useLocation();
  const target = adminUrl(pathname + search);
  const [tried] = useState(() => {
    try {
      const [at, path] = (sessionStorage.getItem(KEY) ?? '').split(' ');
      return path === target && Date.now() - Number(at) < 10_000;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (tried) return;
    try {
      sessionStorage.setItem(KEY, `${Date.now()} ${target}`);
    } catch {
      /* storage blocked: the link below still works */
    }
    window.location.replace(target);
  }, [tried, target]);

  return (
    <div className="min-h-screen grid place-items-center bg-brand-void px-4">
      {tried ? (
        <a
          href={target}
          className="min-h-[44px] inline-flex items-center px-4 rounded-control border border-brand-border text-white"
        >
          Open the admin panel
        </a>
      ) : (
        <span className="loading loading-spinner loading-lg text-brand-emerald" />
      )}
    </div>
  );
}
