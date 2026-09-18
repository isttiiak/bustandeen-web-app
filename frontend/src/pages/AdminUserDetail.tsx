import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AnimatedBackground from '../components/AnimatedBackground.js';
import Seo from '../components/Seo.js';
import {
  useAdminUserDetail,
  useWelcomeDraft,
  useSendWelcomeEmail,
  useReengagementDraft,
  useSendReengagementEmail,
  useSendCustomEmail,
  useDeleteUser,
  useDisableUser,
  useEnableUser,
} from '../hooks/useAdminUsers.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const daysInactive = (lastActiveAt: string | null | undefined, createdAt: string): number =>
  Math.max(0, Math.floor((Date.now() - new Date(lastActiveAt || createdAt).getTime()) / DAY_MS));

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
  const welcomeDraft = useWelcomeDraft();
  const sendWelcome = useSendWelcomeEmail();
  const deleteUser = useDeleteUser();
  const disableUser = useDisableUser();
  const enableUser = useEnableUser();
  const reengagementDraft = useReengagementDraft();
  const sendReengagement = useSendReengagementEmail();
  const sendCustomEmail = useSendCustomEmail();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [disableReason, setDisableReason] = useState('');
  const [showDisableForm, setShowDisableForm] = useState(false);
  const [welcomeForm, setWelcomeForm] = useState<{ subject: string; body: string } | null>(null);
  const [reengagementForm, setReengagementForm] = useState<{
    subject: string;
    body: string;
  } | null>(null);
  const [customEmailForm, setCustomEmailForm] = useState<{
    subject: string;
    body: string;
  } | null>(null);

  const startWelcomeDraft = () => {
    welcomeDraft.mutate(uid, {
      onSuccess: (d) => setWelcomeForm(d),
    });
  };
  const confirmSendWelcome = () => {
    if (!welcomeForm) return;
    sendWelcome.mutate(
      { uid, subject: welcomeForm.subject, body: welcomeForm.body },
      { onSuccess: () => setWelcomeForm(null) }
    );
  };

  const startReengagementDraft = () => {
    reengagementDraft.mutate(uid, {
      onSuccess: (d) => setReengagementForm(d),
    });
  };
  const confirmSendReengagement = () => {
    if (!reengagementForm) return;
    sendReengagement.mutate(
      { uid, subject: reengagementForm.subject, body: reengagementForm.body },
      { onSuccess: () => setReengagementForm(null) }
    );
  };

  const startCustomEmail = () => {
    const name = user?.displayName || user?.firstName || 'there';
    setCustomEmailForm({
      subject: '',
      body: `Assalamu Alaikum ${name},\n\n\n\n— Bustandeen`,
    });
  };
  const confirmSendCustomEmail = () => {
    if (!customEmailForm) return;
    sendCustomEmail.mutate(
      { uid, subject: customEmailForm.subject, body: customEmailForm.body },
      { onSuccess: () => setCustomEmailForm(null) }
    );
  };

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
      <div className="max-w-4xl mx-auto px-6 py-6 sm:py-10 space-y-6">
        <button
          onClick={() => navigate('/admin/users')}
          className="text-white/40 text-sm hover:text-white"
        >
          {t('adminUserDetail.back', '← Back to users')}
        </button>

        {isLoading && <p className="text-white/40 text-sm">{t('common.loading', 'Loading…')}</p>}

        {user && (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-black text-white">
                  {user.displayName ||
                    [user.firstName, user.lastName].filter(Boolean).join(' ') ||
                    user.email}
                </h1>
                <p className="text-white/40 text-sm mt-0.5">{user.email}</p>
              </div>
              {user.disabled && (
                <span className="shrink-0 px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wide bg-red-500/15 text-red-400">
                  {t('adminUserDetail.disabledBadge', 'Disabled')}
                </span>
              )}
            </div>

            <div className="rounded-2xl bg-base-200 border border-base-300 p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
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
                value={`${new Date(user.lastActiveAt || user.createdAt).toLocaleDateString()} · ${t(
                  'adminUserDetail.daysAgo',
                  '{{count}} days ago',
                  { count: daysInactive(user.lastActiveAt, user.createdAt) }
                )}`}
              />
              <Field
                label={t('adminUserDetail.totalZikr', 'Lifetime zikr count')}
                value={user.totalCount.toLocaleString()}
              />
              <Field
                label={t('adminUserDetail.welcomeEmail', 'Welcome email sent')}
                value={
                  user.welcomeEmailSentAt
                    ? new Date(user.welcomeEmailSentAt).toLocaleDateString()
                    : '—'
                }
              />
              <Field
                label={t('adminUserDetail.reengagementSent', 'Re-engagement emails sent')}
                value={
                  user.reengagementEmailCount > 0
                    ? t('adminUserDetail.reengagementSentValue', '{{count}}× · last {{date}}', {
                        count: user.reengagementEmailCount,
                        date: new Date(user.reengagementEmailSentAt!).toLocaleDateString(),
                      })
                    : '—'
                }
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
                {!welcomeForm ? (
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-white/60 text-sm">
                      {t(
                        'adminUserDetail.welcomeDesc',
                        "Welcome email is sent manually — you'll see and can edit the predefined text (e.g. to call out something specific to this person) before anything sends."
                      )}
                    </p>
                    <button
                      onClick={startWelcomeDraft}
                      disabled={welcomeDraft.isPending}
                      className="btn btn-sm bg-brand-emerald hover:bg-brand-emerald-dim border-0 text-white shrink-0"
                    >
                      {welcomeDraft.isPending
                        ? '…'
                        : user.welcomeEmailSentAt
                          ? t('adminUserDetail.resendWelcome', 'Resend welcome email')
                          : t('adminUserDetail.sendWelcome', 'Send welcome email')}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-white/40 text-[10px] uppercase tracking-wide font-bold">
                      {t(
                        'adminUserDetail.welcomeEditable',
                        'Editable draft — review and change anything before sending'
                      )}
                    </p>
                    <input
                      value={welcomeForm.subject}
                      onChange={(e) =>
                        setWelcomeForm((f) => (f ? { ...f, subject: e.target.value } : f))
                      }
                      className="input input-sm w-full bg-white/5 border-brand-emerald/15 text-white rounded-xl"
                    />
                    <textarea
                      value={welcomeForm.body}
                      onChange={(e) =>
                        setWelcomeForm((f) => (f ? { ...f, body: e.target.value } : f))
                      }
                      rows={9}
                      className="textarea textarea-sm w-full bg-white/5 border-brand-emerald/15 text-white rounded-xl font-mono"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={confirmSendWelcome}
                        disabled={sendWelcome.isPending}
                        className="btn btn-sm bg-brand-emerald hover:bg-brand-emerald-dim border-0 text-white"
                      >
                        {sendWelcome.isPending
                          ? '…'
                          : t('adminUserDetail.confirmSend', 'Send this email')}
                      </button>
                      <button
                        onClick={() => setWelcomeForm(null)}
                        className="btn btn-sm btn-ghost text-white/50"
                      >
                        {t('adminZikr.cancel', 'Cancel')}
                      </button>
                    </div>
                  </div>
                )}
                {sendWelcome.isSuccess && (
                  <p className="text-brand-emerald text-xs">
                    {t('adminUserDetail.resendSent', 'Sent.')}
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-brand-info/20 bg-brand-info/[0.04] p-4 space-y-3">
                {!reengagementForm ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-white/60 text-sm">
                        {t(
                          'adminUserDetail.reengagementDesc',
                          "It's been {{count}} days since this person was last active. Draft a gentle re-engagement email — you'll see and can edit the exact text before anything sends.",
                          { count: daysInactive(user.lastActiveAt, user.createdAt) }
                        )}
                      </p>
                      {user.reengagementEmailCount > 0 && (
                        <p className="text-white/30 text-xs">
                          {t(
                            'adminUserDetail.reengagementHistory',
                            "Already sent {{count}}× — most recently {{date}}. That doesn't mean they came back, so it's fine to send again.",
                            {
                              count: user.reengagementEmailCount,
                              date: new Date(user.reengagementEmailSentAt!).toLocaleDateString(),
                            }
                          )}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={startReengagementDraft}
                      disabled={reengagementDraft.isPending}
                      className="btn btn-sm bg-brand-info hover:opacity-90 border-0 text-white shrink-0"
                    >
                      {reengagementDraft.isPending
                        ? '…'
                        : t('adminUserDetail.draftReengagement', 'Draft re-engagement email')}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-white/40 text-[10px] uppercase tracking-wide font-bold">
                      {t(
                        'adminUserDetail.reengagementEditable',
                        'Editable draft — review and change anything before sending'
                      )}
                    </p>
                    <input
                      value={reengagementForm.subject}
                      onChange={(e) =>
                        setReengagementForm((f) => (f ? { ...f, subject: e.target.value } : f))
                      }
                      className="input input-sm w-full bg-white/5 border-brand-info/15 text-white rounded-xl"
                    />
                    <textarea
                      value={reengagementForm.body}
                      onChange={(e) =>
                        setReengagementForm((f) => (f ? { ...f, body: e.target.value } : f))
                      }
                      rows={7}
                      className="textarea textarea-sm w-full bg-white/5 border-brand-info/15 text-white rounded-xl font-mono"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={confirmSendReengagement}
                        disabled={sendReengagement.isPending}
                        className="btn btn-sm bg-brand-info hover:opacity-90 border-0 text-white"
                      >
                        {sendReengagement.isPending
                          ? '…'
                          : t('adminUserDetail.confirmSend', 'Send this email')}
                      </button>
                      <button
                        onClick={() => setReengagementForm(null)}
                        className="btn btn-sm btn-ghost text-white/50"
                      >
                        {t('adminZikr.cancel', 'Cancel')}
                      </button>
                    </div>
                  </div>
                )}
                {sendReengagement.isSuccess && (
                  <p className="text-brand-emerald text-xs">
                    {t('adminUserDetail.resendSent', 'Sent.')}
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-brand-magenta/20 bg-brand-magenta/[0.04] p-4 space-y-3">
                {!customEmailForm ? (
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-white/60 text-sm">
                      {t(
                        'adminUserDetail.customEmailDesc',
                        'Write a fully custom, one-off email to this person — not the welcome or re-engagement template.'
                      )}
                    </p>
                    <button
                      onClick={startCustomEmail}
                      className="btn btn-sm bg-brand-magenta hover:opacity-90 border-0 text-white shrink-0"
                    >
                      {t('adminUserDetail.composeCustom', 'Compose custom email')}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      value={customEmailForm.subject}
                      onChange={(e) =>
                        setCustomEmailForm((f) => (f ? { ...f, subject: e.target.value } : f))
                      }
                      placeholder={t('adminUserDetail.customEmailSubject', 'Subject')}
                      className="input input-sm w-full bg-white/5 border-brand-magenta/15 text-white rounded-xl"
                    />
                    <textarea
                      value={customEmailForm.body}
                      onChange={(e) =>
                        setCustomEmailForm((f) => (f ? { ...f, body: e.target.value } : f))
                      }
                      rows={9}
                      className="textarea textarea-sm w-full bg-white/5 border-brand-magenta/15 text-white rounded-xl font-mono"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={confirmSendCustomEmail}
                        disabled={sendCustomEmail.isPending}
                        className="btn btn-sm bg-brand-magenta hover:opacity-90 border-0 text-white"
                      >
                        {sendCustomEmail.isPending
                          ? '…'
                          : t('adminUserDetail.confirmSend', 'Send this email')}
                      </button>
                      <button
                        onClick={() => setCustomEmailForm(null)}
                        className="btn btn-sm btn-ghost text-white/50"
                      >
                        {t('adminZikr.cancel', 'Cancel')}
                      </button>
                    </div>
                  </div>
                )}
                {sendCustomEmail.isSuccess && (
                  <p className="text-brand-emerald text-xs">
                    {t('adminUserDetail.resendSent', 'Sent.')}
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-brand-gold/20 bg-brand-gold/[0.04] p-4 space-y-3">
                <p className="text-white/60 text-sm">
                  {user.disabled
                    ? t(
                        'adminUserDetail.disabledDesc',
                        'This account is disabled — sign-in is blocked everywhere, but no data was touched. Re-enabling restores access immediately.'
                      )
                    : t(
                        'adminUserDetail.disableDesc',
                        'Blocks sign-in immediately without deleting any data — reversible, unlike the permanent delete below. Use for abuse, not routine cleanup.'
                      )}
                </p>
                {user.disabled && user.disabledReason && (
                  <p className="text-white/40 text-xs italic">
                    {t('adminUserDetail.disabledReasonLabel', 'Reason:')} {user.disabledReason}
                  </p>
                )}
                {user.disabled ? (
                  <button
                    onClick={() => enableUser.mutate(uid)}
                    disabled={enableUser.isPending}
                    className="btn btn-sm bg-brand-emerald hover:bg-brand-emerald-dim border-0 text-white shrink-0"
                  >
                    {enableUser.isPending ? '…' : t('adminUserDetail.enable', 'Re-enable account')}
                  </button>
                ) : !showDisableForm ? (
                  <button
                    onClick={() => setShowDisableForm(true)}
                    className="btn btn-sm bg-brand-gold/20 hover:bg-brand-gold/30 border-0 text-brand-gold shrink-0"
                  >
                    {t('adminUserDetail.disable', 'Disable account')}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <input
                      value={disableReason}
                      onChange={(e) => setDisableReason(e.target.value)}
                      placeholder={t(
                        'adminUserDetail.disableReasonPlaceholder',
                        'Reason (internal note, optional)'
                      )}
                      className="input input-sm w-full bg-white/5 border-brand-gold/15 text-white rounded-xl"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          disableUser.mutate(
                            { uid, reason: disableReason.trim() || undefined },
                            { onSuccess: () => setShowDisableForm(false) }
                          )
                        }
                        disabled={disableUser.isPending}
                        className="btn btn-sm bg-brand-gold/80 hover:bg-brand-gold border-0 text-black font-bold"
                      >
                        {disableUser.isPending
                          ? '…'
                          : t('adminUserDetail.confirmDisable', 'Confirm disable')}
                      </button>
                      <button
                        onClick={() => setShowDisableForm(false)}
                        className="btn btn-sm btn-ghost text-white/50"
                      >
                        {t('adminZikr.cancel', 'Cancel')}
                      </button>
                    </div>
                  </div>
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
