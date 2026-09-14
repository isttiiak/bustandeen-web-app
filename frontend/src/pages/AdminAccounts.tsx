import { useState, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import AnimatedBackground from '../components/AnimatedBackground.js';
import Seo from '../components/Seo.js';
import { useAdminStore } from '../store/useAdminStore.js';
import {
  useAdminAccounts,
  useCreateAdminAccount,
  useSetAdminAccountActive,
  AdminAccountListItem,
} from '../hooks/useAdminAccounts.js';

function AddAnsarForm() {
  const { t } = useTranslation();
  const create = useCreateAdminAccount();
  const [form, setForm] = useState({ email: '', password: '', displayName: '' });
  const [open, setOpen] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.email || form.password.length < 8) return;
    create.mutate(
      { ...form, role: 'ansar' },
      {
        onSuccess: () => {
          setForm({ email: '', password: '', displayName: '' });
          setOpen(false);
        },
      }
    );
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="btn btn-sm rounded-xl border-0 bg-brand-emerald text-white"
      >
        {t('adminAccounts.addAnsar', '+ Add Ansar')}
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-brand-emerald/15 bg-white/[0.03] p-4 space-y-3 max-w-sm"
    >
      <input
        type="email"
        required
        value={form.email}
        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        placeholder={t('adminAccounts.emailPlaceholder', 'Ansar email')}
        className="input input-sm w-full bg-white/5 border-brand-emerald/15 text-white rounded-xl"
      />
      <input
        value={form.displayName}
        onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
        placeholder={t('adminAccounts.namePlaceholder', 'Display name (optional)')}
        className="input input-sm w-full bg-white/5 border-brand-emerald/15 text-white rounded-xl"
      />
      <input
        type="password"
        required
        minLength={8}
        value={form.password}
        onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
        placeholder={t('adminAccounts.passwordPlaceholder', 'Temporary password (min 8 chars)')}
        className="input input-sm w-full bg-white/5 border-brand-emerald/15 text-white rounded-xl"
      />
      {create.isError && (
        <p className="text-red-400 text-xs">
          {t(
            'adminAccounts.createError',
            'Could not create this account — email may already exist.'
          )}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={create.isPending}
          className="btn btn-sm rounded-xl border-0 bg-brand-emerald text-white disabled:opacity-50"
        >
          {create.isPending ? '…' : t('adminAccounts.create', 'Create')}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn btn-sm rounded-xl bg-transparent text-white/50"
        >
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
  const isSelf = account.email === myEmail;

  return (
    <tr className="border-b border-base-300/60 last:border-0">
      <td className="px-3 py-2 text-white/80">{account.email}</td>
      <td className="px-3 py-2">
        <span
          className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
            account.role === 'servant'
              ? 'bg-brand-gold/15 text-brand-gold'
              : 'bg-brand-emerald/15 text-brand-emerald'
          }`}
        >
          {account.role === 'servant'
            ? t('adminGate.servant', 'Servant')
            : t('adminGate.ansar', 'Ansar')}
        </span>
      </td>
      <td className="px-3 py-2 text-white/60">
        {account.active
          ? t('adminAccounts.active', 'Active')
          : t('adminAccounts.inactive', 'Deactivated')}
      </td>
      <td className="px-3 py-2 text-white/60">
        {account.lastLoginAt ? new Date(account.lastLoginAt).toLocaleString() : '—'}
      </td>
      <td className="px-3 py-2">
        {!isSelf && (
          <button
            onClick={() => setActive.mutate({ id: account.id, active: !account.active })}
            disabled={setActive.isPending}
            className={`btn btn-xs rounded-lg border-0 disabled:opacity-40 ${
              account.active
                ? 'bg-red-500/20 text-red-300'
                : 'bg-brand-emerald/20 text-brand-emerald'
            }`}
          >
            {account.active
              ? t('adminAccounts.deactivate', 'Deactivate')
              : t('adminAccounts.reactivate', 'Reactivate')}
          </button>
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
      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-black text-white">
            {t('adminAccounts.title', 'Manage Ansars')}
          </h1>
          <p className="text-sm text-white/50 mt-1">
            {t(
              'adminAccounts.subtitle',
              'Servant-only. Add a new Ansar or revoke an existing one — deactivating takes effect immediately.'
            )}
          </p>
        </div>

        <AddAnsarForm />

        <div className="rounded-2xl bg-base-200 border border-base-300 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-white/40 text-xs uppercase tracking-wide border-b border-base-300">
                <th className="px-3 py-2">{t('adminAccounts.colEmail', 'Email')}</th>
                <th className="px-3 py-2">{t('adminAccounts.colRole', 'Role')}</th>
                <th className="px-3 py-2">{t('adminAccounts.colStatus', 'Status')}</th>
                <th className="px-3 py-2">{t('adminAccounts.colLastLogin', 'Last login')}</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5} className="text-center text-white/30 py-6">
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
