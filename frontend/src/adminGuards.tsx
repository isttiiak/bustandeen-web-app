// The admin panel's route guards (moved out of routeGuards.tsx in v5.163.0,
// when the panel became its own site: admin.html, src/admin-entry.tsx).
import React, { lazy, Suspense } from 'react';
import { useAdminStore } from './store/useAdminStore.js';

// Lazy, both: they bring the admin panel's own Firebase app (adminFirebase.ts,
// through AdminGate and the logout in AdminLayout).
const AdminGate = lazy(() => import('./components/AdminGate.js'));
const AdminLayout = lazy(() => import('./components/AdminLayout.js'));

interface ProtectedProps {
  children: React.ReactNode;
}

export function AdminFallback() {
  return (
    <div className="min-h-screen grid place-items-center bg-brand-void">
      <span className="loading loading-spinner loading-lg text-brand-emerald" />
    </div>
  );
}

/**
 * Admin-only pages: gated by AdminGate's own real Firebase sign-in (a second,
 * isolated Firebase app — see adminFirebase.ts) confirmed against the
 * backend's AdminAccount collection — deliberately NOT wrapped in the main
 * app's Protected/Firebase account, since a Servant/Ansar should never need
 * a REGULAR app account to reach the admin panel, and the two identities
 * must never be conflated (see AdminLayout.tsx's doc comment for the
 * incident that motivated this separation). AdminLayout renders the admin
 * panel's own chrome. Since v5.163.0 the panel is its own site (admin.html,
 * admin.bustandeen.com), so the main app's Navbar is not even loaded there.
 * Real enforcement is always server-side (requireAdminAuth on every
 * /api/admin/* route); this route being reachable while signed out is
 * expected, not a hole.
 */
export const AdminProtected = ({ children }: ProtectedProps) => (
  <Suspense fallback={<AdminFallback />}>
    <AdminGate>
      <AdminLayout>{children}</AdminLayout>
    </AdminGate>
  </Suspense>
);

/** Servant-only pages (user directory, managing Ansars) — the backend
 *  already 403s an Ansar's API calls, this just avoids rendering a page that
 *  can't do anything for that role. Must be nested INSIDE AdminProtected so
 *  useAdminStore's role is populated by the time this checks it. */
export const ServantProtected = ({ children }: ProtectedProps) => {
  const role = useAdminStore((s) => s.role);
  if (role !== 'servant') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center text-white/60">
        Servant-only page.
      </div>
    );
  }
  return <>{children}</>;
};

/** Pages for the Servant and the 'general' Ansar (the sadaqah Ansar's API
 *  calls are refused there). Nested inside AdminProtected like the above. */
export const GeneralDomainProtected = ({ children }: ProtectedProps) => {
  const role = useAdminStore((s) => s.role);
  const ansarDomain = useAdminStore((s) => s.ansarDomain);
  if (role !== 'servant' && ansarDomain !== 'general') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center text-white/60">
        Not part of your area.
      </div>
    );
  }
  return <>{children}</>;
};
