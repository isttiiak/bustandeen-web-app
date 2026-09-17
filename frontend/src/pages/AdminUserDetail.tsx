import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AnimatedBackground from '../components/AnimatedBackground.js';
import Seo from '../components/Seo.js';
import {
  useAdminUserDetail,
  useResendWelcomeEmail,
  useDeleteUser,
} from '../hooks/useAdminUsers.js';

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-white/30 text-[10px] uppercase tracking-wide">{label}</p>
      <p className="text-white text-sm font-bold mt-0.5">{value}</p>
    </div>
  );
}

export default function AdminUserDetail() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { uid = '' } = useParams<{ uid: string }>();
  const { data: user, isLoading } = useAdminUserDetail(uid);
  const resendWelcome = useResendWelcomeEmail();
  const deleteUser = useDeleteUser();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const clickDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 6000);
      return;
    }
    deleteUser.mutate(uid, { onSuccess: () => navigate('/admin/users') });
  };

  return (
    <AnimatedBackground variant="dark">
      <Seo
        title={t('adminUserDetail.seoTitle', 'User Detail')}
        description="Internal dashboard."
        path="/admin/users"
        index={false}
      />
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10 space-y-6">
        <button
          onClick={() => navigate('/admin/users')}
          className="text-white/40 text-sm hover:text-white"
        >
          {t('adminUserDetail.back', '← Back to users')}
        </button>

        {isLoading && <p className="text-white/40 text-sm">{t('common.loading', 'Loading…')}</p>}

        {user && (
          <>
            <div>
              <h1 className="text-2xl font-black text-white">
                {user.displayName ||
                  [user.firstName, user.lastName].filter(Boolean).join(' ') ||
                  user.email}
              </h1>
              <p className="text-white/40 text-sm mt-0.5">{user.email}</p>
            </div>

            <div className="rounded-2xl bg-base-200 border border-base-300 p-4 grid grid-cols-2 gap-4">
              <Field
                label={t('adminUserDetail.location', 'Location')}
                value={[user.city, user.country].filter(Boolean).join(', ') || '—'}
              />
              <Field
                label={t('adminUserDetail.joined', 'Joined')}
                value={new Date(user.createdAt).toLocaleDateString()}
              />
              <Field
                label={t('adminUserDetail.lastActive', 'Last active (approx.)')}
                value={new Date(user.updatedAt).toLocaleString()}
              />
              <Field
                label={t('adminUserDetail.totalZikr', 'Lifetime zikr count')}
                value={user.totalCount.toLocaleString()}
              />
              <Field
                label={t('adminUserDetail.zikrTypesCount', 'Zikr types tracked')}
                value={user.zikrTypes.length}
              />
              <Field
                label={t('adminUserDetail.welcomeEmail', 'Welcome email sent')}
                value={user.welcomeEmailSentAt ? '✓' : '—'}
              />
              <Field
                label={t('adminUserDetail.aiEnabled', 'AI companion enabled')}
                value={user.aiEnabled ? '✓' : '—'}
              />
              <Field
                label={t('adminUserDetail.uid', 'UID')}
                value={<span className="font-mono text-xs">{user.uid}</span>}
              />
            </div>

            <section className="space-y-3">
              <h2 className="text-white font-bold text-sm uppercase tracking-widest text-white/50">
                {t('adminUserDetail.actions', 'Actions')}
              </h2>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-white/60 text-sm">
                    {t(
                      'adminUserDetail.resendWelcomeDesc',
                      'Resend the one-time welcome email to this person.'
                    )}
                  </p>
                  <button
                    onClick={() => resendWelcome.mutate(uid)}
                    disabled={resendWelcome.isPending}
                    className="btn btn-sm bg-brand-emerald hover:bg-brand-emerald-dim border-0 text-white shrink-0"
                  >
                    {resendWelcome.isPending
                      ? '…'
                      : t('adminUserDetail.resendWelcome', 'Resend welcome email')}
                  </button>
                </div>
                {resendWelcome.isSuccess && (
                  <p className="text-brand-emerald text-xs">
                    {t('adminUserDetail.resendSent', 'Sent.')}
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-4 space-y-3">
                <p className="text-white/60 text-sm">
                  {t(
                    'adminUserDetail.deleteDesc',
                    'Permanently deletes this account and all of its data across every feature (zikr, salat, fasting, Quran, Rayhanah, etc.) and revokes their Firebase sign-in. Cannot be undone.'
                  )}
                </p>
                <button
                  onClick={clickDelete}
                  disabled={deleteUser.isPending}
                  className={`btn btn-sm border-0 text-white shrink-0 ${
                    confirmDelete ? 'bg-red-600' : 'bg-red-500/80 hover:bg-red-600'
                  }`}
                >
                  {deleteUser.isPending
                    ? '…'
                    : confirmDelete
                      ? t(
                          'adminUserDetail.confirmDelete',
                          'Click again to confirm — this is permanent'
                        )
                      : t('adminUserDetail.deleteAccount', 'Delete this account')}
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </AnimatedBackground>
  );
}
