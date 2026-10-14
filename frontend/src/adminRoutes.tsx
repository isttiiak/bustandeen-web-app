// The admin site's route table (v5.163.0): the only routes admin.html serves.
// Paths keep their /admin prefix, so every link inside the panel stays as it
// was; admin.bustandeen.com/ itself redirects to /admin (vercel.json).
import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { AdminProtected, GeneralDomainProtected, ServantProtected } from './adminGuards.js';

const AdminHome = lazy(() => import('./pages/AdminHome.js'));
const AdminSadaqah = lazy(() => import('./pages/AdminSadaqah.js'));
const AdminZikrRequests = lazy(() => import('./pages/AdminZikrRequests.js'));
const AdminUsers = lazy(() => import('./pages/AdminUsers.js'));
const AdminUserDetail = lazy(() => import('./pages/AdminUserDetail.js'));
const AdminAccounts = lazy(() => import('./pages/AdminAccounts.js'));
const AdminFeedback = lazy(() => import('./pages/AdminFeedback.js'));
const AdminAuditLog = lazy(() => import('./pages/AdminAuditLog.js'));
const AdminOpsHealth = lazy(() => import('./pages/AdminOpsHealth.js'));
const AdminBroadcast = lazy(() => import('./pages/AdminBroadcast.js'));
const AdminMoonSighting = lazy(() => import('./pages/AdminMoonSighting.js'));
const AdminComposeEmail = lazy(() => import('./pages/AdminComposeEmail.js'));

export default function AdminRoutes() {
  return (
    <Routes>
      <Route
        path="/admin"
        element={
          <AdminProtected>
            <AdminHome />
          </AdminProtected>
        }
      />
      <Route
        path="/admin/sadaqah"
        element={
          <AdminProtected>
            <AdminSadaqah />
          </AdminProtected>
        }
      />
      <Route
        path="/admin/zikr-requests"
        element={
          <AdminProtected>
            <AdminZikrRequests />
          </AdminProtected>
        }
      />
      <Route
        path="/admin/users"
        element={
          <AdminProtected>
            <ServantProtected>
              <AdminUsers />
            </ServantProtected>
          </AdminProtected>
        }
      />
      <Route
        path="/admin/users/:uid"
        element={
          <AdminProtected>
            <ServantProtected>
              <AdminUserDetail />
            </ServantProtected>
          </AdminProtected>
        }
      />
      <Route
        path="/admin/accounts"
        element={
          <AdminProtected>
            <ServantProtected>
              <AdminAccounts />
            </ServantProtected>
          </AdminProtected>
        }
      />
      <Route
        path="/admin/feedback"
        element={
          <AdminProtected>
            <AdminFeedback />
          </AdminProtected>
        }
      />
      <Route
        path="/admin/audit-log"
        element={
          <AdminProtected>
            <ServantProtected>
              <AdminAuditLog />
            </ServantProtected>
          </AdminProtected>
        }
      />
      <Route
        path="/admin/ops-health"
        element={
          <AdminProtected>
            <ServantProtected>
              <AdminOpsHealth />
            </ServantProtected>
          </AdminProtected>
        }
      />
      <Route
        path="/admin/broadcast"
        element={
          <AdminProtected>
            <GeneralDomainProtected>
              <AdminBroadcast />
            </GeneralDomainProtected>
          </AdminProtected>
        }
      />
      <Route
        path="/admin/moon-sighting"
        element={
          <AdminProtected>
            <GeneralDomainProtected>
              <AdminMoonSighting />
            </GeneralDomainProtected>
          </AdminProtected>
        }
      />
      <Route
        path="/admin/compose-email"
        element={
          <AdminProtected>
            <ServantProtected>
              <AdminComposeEmail />
            </ServantProtected>
          </AdminProtected>
        }
      />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
