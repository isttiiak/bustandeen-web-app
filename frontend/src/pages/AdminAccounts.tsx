import { useState, FormEvent } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import AnimatedBackground from '../components/AnimatedBackground.js';
import { PlusIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import Seo from '../components/Seo.js';
import {
  ADMIN_INPUT_SM,
  AdminHero,
  BTN_DANGER,
  BTN_SMALL,
  OPTION_CHIP,
  PILL_EMERALD,
  PILL_GOLD,
} from '../components/admin/adminParts.js';
import { BTN_PRIMARY, BTN_SECONDARY, OPTION_OFF, OPTION_ON } from '../components/bustanStyles.js';
import { useAdminStore } from '../store/useAdminStore.js';
import {
  useAdminAccounts,
  useCreateAdminAccount,
  useSetAdminAccountActive,
  useSetAdminAccountDomain,
  useSendAdminPasswordReset,
  AdminAccountListItem,
  type AdminFirebaseLink,
} from '../hooks/useAdminAccounts.js';
import type { AnsarDomain } from '../store/useAdminStore.js';

function AddAnsarForm() {
  const { t } = useTranslation();
  const create = useCreateAdminAccount();
  const [form, setForm] = useState({ email: '', password: '', displayName: '' });
  const [ansarDomain, setAnsarDomain] = useState<'sadaqah' | 'general'>('general');
  const [open, setOpen] = useState(false);
  const [linkNotice, setLinkNotice] = useState<{ email: string; link: AdminFirebaseLink } | null>(
    null
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.email || form.password.length < 8) return;
    const email = form.email.trim().toLowerCase();
    create.mutate(
      { ...form, role: 'ansar', ansarDomain },
      {
        onSuccess: (data) => {
          setLinkNotice(
            data.firebase === 'linked' || data.firebase === 'reclaimed'
              ? { email, link: data.firebase }
              : null
          );
          setForm({ email: '', password: '', displayName: '' });
          setAnsarDomain('general');
          setOpen(false);
        },
      }
    );
  };

  if (!open) {
    return (
      <div className="space-y-2">
        {linkNotice && (
          <p role="status" className="text-xs text-white/80 max-w-sm">
            {linkNotice.link === 'linked'
              ? t(
                  'adminAccounts.linkedExisting',
                  '{{email}} already had a verified Bustandeen account. It is now an Ansar and signs in to the panel with that account’s own password, not the one typed here.',
                  { email: linkNotice.email }
                )
              : t(
                  'adminAccounts.reclaimedExisting',
                  '{{email}} had an unverified Bustandeen account. Its password is now the one typed here and any old sign-ins were ended.',
                  { email: linkNotice.email }
                )}
          </p>
        )}
        <button
          onClick={() => {
            setLinkNotice(null);
            setOpen(true);
          }}
          className={BTN_PRIMARY}
        >
          <PlusIcon className="w-4 h-4" aria-hidden="true" />
          {t('adminAccounts.addAnsar', 'Add Ansar')}
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-card border border-brand-border bg-brand-deep shadow-elev-2 p-4 space-y-3 max-w-sm"
    >
      <input
        type="email"
        required
        value={form.email}
        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        placeholder={t('adminAccounts.emailPlaceholder', 'Ansar email')}
        aria-label={t('adminAccounts.emailPlaceholder', 'Ansar email')}
        className={`${ADMIN_INPUT_SM} w-full`}
      />
      <input
        value={form.displayName}
        onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
        placeholder={t('adminAccounts.namePlaceholder', 'Display name (optional)')}
        aria-label={t('adminAccounts.namePlaceholder', 'Display name (optional)')}
        className={`${ADMIN_INPUT_SM} w-full`}
      />
      <input
        type="password"
        required
        minLength={8}
        value={form.password}
        onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
        placeholder={t('adminAccounts.passwordPlaceholder', 'Temporary password (min 8 chars)')}
        aria-label={t('adminAccounts.passwordPlaceholder', 'Temporary password (min 8 chars)')}
        className={`${ADMIN_INPUT_SM} w-full`}
      />
      <div>
        <p className="text-xs text-white/70 mb-1">
          {t('adminAccounts.domainLabel', 'Which area does this Ansar manage?')}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setAnsarDomain('general')}
            aria-pressed={ansarDomain === 'general'}
            className={`${OPTION_CHIP} flex-1 justify-center ${ansarDomain === 'general' ? OPTION_ON : OPTION_OFF}`}
          >
            {t('adminAccounts.domainGeneral', 'General (zikr review, etc.)')}
          </button>
          <button
            type="button"
            onClick={() => setAnsarDomain('sadaqah')}
            aria-pressed={ansarDomain === 'sadaqah'}
            className={`${OPTION_CHIP} flex-1 justify-center ${ansarDomain === 'sadaqah' ? OPTION_ON : OPTION_OFF}`}
          >
            {t('adminAccounts.domainSadaqah', 'Sadaqah only')}
          </button>
        </div>
      </div>
      {create.isError && (
        <p className="text-red-400 text-xs">
          {t(
            'adminAccounts.createError',
            'Could not create this account. The email may already exist.'
          )}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={create.isPending} className={BTN_PRIMARY}>
          {create.isPending ? (
            <span className="loading loading-spinner loading-xs" aria-label="Creating" />
          ) : (
            t('adminAccounts.create', 'Create')
          )}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={BTN_SECONDARY}>
          {t('adminAccounts.cancel', 'Cancel')}
        </button>
      </div>
    </form>
  );
}

function AccountRow({ account }: { account: AdminAccountListItem }) {
  const { t } = useTranslation();
  const myEmail = useAdminStore((s) => s.email);
  const setActive = useSetAdminAccountActive();
  const setDomain = useSetAdminAccountDomain();
  const sendReset = useSendAdminPasswordReset();
  const isSelf = account.email === myEmail;

  return (
    <tr className="border-b border-brand-border/60 last:border-0">
      <td className="px-3 py-2 text-white/80">{account.email}</td>
      <td className="px-3 py-2">
        <span
          className={`${account.role === 'servant' ? PILL_GOLD : PILL_EMERALD} uppercase tracking-wide`}
        >
          {account.role === 'servant'
            ? t('adminGate.servant', 'Servant')
            : t('adminGate.ansar', 'Ansar')}
        </span>
      </td>
      <td className="px-3 py-2">
        {account.role === 'ansar' ? (
          <select
            value={account.ansarDomain ?? 'general'}
            onChange={(e) =>
              setDomain.mutate({ id: account.id, ansarDomain: e.target.value as AnsarDomain })
            }
            disabled={setDomain.isPending}
            aria-label={t('adminAccounts.colDomain', 'Domain')}
            className={`${ADMIN_INPUT_SM} !py-1 text-xs disabled:opacity-50`}
          >
            <option value="general">{t('adminAccounts.domainGeneralBadge', 'General')}</option>
            <option value="sadaqah">{t('adminAccounts.domainSadaqahBadge', 'Sadaqah')}</option>
          </select>
        ) : (
          <span className="text-white/70 text-xs">
            {t('adminAccounts.allAccess', 'All access')}
          </span>
        )}
      </td>
      <td className="px-3 py-2 text-white/70">
        {account.active
          ? t('adminAccounts.active', 'Active')
          : t('adminAccounts.inactive', 'Deactivated')}
      </td>
      <td className="px-3 py-2 text-white/70">
        {account.lastLoginAt ? new Date(account.lastLoginAt).toLocaleString() : '-'}
      </td>
      <td className="px-3 py-2">
        {!isSelf && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActive.mutate({ id: account.id, active: !account.active })}
              disabled={setActive.isPending}
              className={account.active ? BTN_DANGER : BTN_SMALL}
            >
              {account.active
                ? t('adminAccounts.deactivate', 'Deactivate')
                : t('adminAccounts.reactivate', 'Reactivate')}
            </button>
            {account.active && (
              <button
                onClick={() => sendReset.mutate(account.id)}
                disabled={sendReset.isPending || sendReset.isSuccess}
                className={BTN_SMALL}
                title={t('adminAccounts.sendResetHint', 'Emails them a link to set a new password')}
              >
                {sendReset.isSuccess
                  ? t('adminAccounts.resetSent', 'Reset link sent')
                  : sendReset.isPending
                    ? '…'
                    : t('adminAccounts.sendReset', 'Send reset link')}
              </button>
            )}
            {sendReset.isError && (
              <span role="alert" className="text-red-400 text-xs">
                {axios.isAxiosError(sendReset.error) && sendReset.error.response?.data?.error
                  ? String(sendReset.error.response.data.error)
                  : t('adminAccounts.resetFailed', 'Could not send the link.')}
              </span>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}

export default function AdminAccounts() {
  const { t } = useTranslation();
  const { data: accounts, isLoading } = useAdminAccounts();

  return (
    <AnimatedBackground variant="dark">
      <Seo
        title={t('adminAccounts.seoTitle', 'Manage Ansars')}
        description="Internal dashboard."
        path="/admin/accounts"
        index={false}
      />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        <AdminHero
          icon={ShieldCheckIcon}
          title={t('adminAccounts.title', 'Manage Ansars')}
          subtitle={t(
            'adminAccounts.subtitle',
            'Servant-only. Add a new Ansar, change which area they manage, or revoke an existing one. Every change takes effect immediately.'
          )}
        />

        <AddAnsarForm />

        <div className="rounded-card border border-brand-border bg-brand-deep shadow-elev-2 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-white/70 text-xs uppercase tracking-wide border-b border-brand-border">
                <th className="px-3 py-2">{t('adminAccounts.colEmail', 'Email')}</th>
                <th className="px-3 py-2">{t('adminAccounts.colRole', 'Role')}</th>
                <th className="px-3 py-2">{t('adminAccounts.colDomain', 'Domain')}</th>
                <th className="px-3 py-2">{t('adminAccounts.colStatus', 'Status')}</th>
                <th className="px-3 py-2">{t('adminAccounts.colLastLogin', 'Last login')}</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="text-center text-white/70 py-6">
                    {t('common.loading', 'Loading…')}
                  </td>
                </tr>
              )}
              {accounts?.map((a) => (
                <AccountRow key={a.id} account={a} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AnimatedBackground>
  );
}
