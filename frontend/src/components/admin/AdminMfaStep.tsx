import { useState, FormEvent } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { DevicePhoneMobileIcon, KeyIcon } from '@heroicons/react/24/outline';
import {
  AuthCard,
  AuthHero,
  AuthShell,
  ErrorNote,
  INPUT,
  LABEL,
  TEXT_ACTION,
} from '../auth/authParts.js';
import { BTN_PRIMARY, BTN_SECONDARY } from '../bustanStyles.js';
import AdminReauthDialog from './AdminReauthDialog.js';
import { qrPath } from '../../seo/utils/qr.js';
import {
  useAdminLogout,
  useAdminMfaEnrolConfirm,
  useAdminMfaEnrolStart,
  useAdminMfaVerify,
} from '../../hooks/useAdminAuth.js';
import { useAdminStore, type AdminMfaStep as Step } from '../../store/useAdminStore.js';

/**
 * Second sign-in step for the admin panel (T1.4): a code from an
 * authenticator app, or a one-time backup code. An admin without an
 * authenticator sets one up here first (QR code, first code, backup codes).
 * Shown by AdminGate between the password sign-in and the panel.
 */

const errorText = (err: unknown, t: ReturnType<typeof useTranslation>['t']): string => {
  if (axios.isAxiosError(err)) {
    if (err.response?.status === 429) {
      return t('adminMfa.tooMany', 'Too many attempts. Please wait 15 minutes and try again.');
    }
    const code = (err.response?.data as { error?: string } | undefined)?.error;
    if (code === 'mfa_code_invalid') {
      return t(
        'adminMfa.invalid',
        'That code did not work. Check that the time on your phone is set automatically, then try the next code.'
      );
    }
    if (code === 'mfa_enrolment_expired') {
      return t('adminMfa.expired', 'This setup took longer than 10 minutes. Please start again.');
    }
  }
  return t('adminMfa.failed', 'Something went wrong. Please try again.');
};

function QrCode({ text }: { text: string }) {
  const { size, d } = qrPath(text);
  return (
    // Always dark modules on white, whatever the theme: scanners need contrast.
    <svg
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="QR code for your authenticator app"
      className="w-48 h-48 rounded-control bg-on-color p-1"
      shapeRendering="crispEdges"
    >
      <path d={d} className="fill-ink-fixed" />
    </svg>
  );
}

function CodeField({
  id,
  backup,
  value,
  onChange,
}: {
  id: string;
  backup: boolean;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      id={id}
      value={value}
      onChange={(e) =>
        onChange(
          backup ? e.target.value.slice(0, 20) : e.target.value.replace(/\D/g, '').slice(0, 6)
        )
      }
      inputMode={backup ? 'text' : 'numeric'}
      autoComplete="one-time-code"
      autoCapitalize={backup ? 'characters' : 'off'}
      spellCheck={false}
      placeholder={backup ? 'XXXXX-XXXXX' : '123456'}
      className={`${INPUT} text-center font-mono text-lg tracking-[0.3em]`}
    />
  );
}

function VerifyStep() {
  const { t } = useTranslation();
  const verify = useAdminMfaVerify();
  const setMfaPassed = useAdminStore((s) => s.setMfaPassed);
  const [code, setCode] = useState('');
  const [backup, setBackup] = useState(false);

  const ready = backup ? code.replace(/[\s-]/g, '').length >= 10 : code.length === 6;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    verify.mutate(code, {
      onSuccess: (data) => {
        if (data.usedBackupCode) {
          toast(
            t('adminMfa.backupUsed', {
              defaultValue:
                'Backup code used. {{count}} left. If your phone is lost, ask the Servant to reset your authenticator.',
              count: data.backupCodesLeft,
            }),
            { duration: 8000 }
          );
        }
        setMfaPassed();
      },
      onError: () => setCode(''),
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="admin-mfa-code" className={LABEL}>
          {backup
            ? t('adminMfa.backupLabel', 'Backup code')
            : t('adminMfa.codeLabel', '6-digit code from your authenticator app')}
        </label>
        <CodeField id="admin-mfa-code" backup={backup} value={code} onChange={setCode} />
      </div>
      {verify.isError && <ErrorNote>{errorText(verify.error, t)}</ErrorNote>}
      <button
        type="submit"
        disabled={verify.isPending || !ready}
        className={`${BTN_PRIMARY} w-full`}
      >
        {verify.isPending ? (
          <span className="loading loading-spinner loading-sm" aria-label="Checking" />
        ) : (
          t('adminMfa.verify', 'Continue')
        )}
      </button>
      <button
        type="button"
        onClick={() => {
          setBackup((b) => !b);
          setCode('');
          verify.reset();
        }}
        className={`${TEXT_ACTION} w-full min-h-[44px]`}
      >
        {backup
          ? t('adminMfa.useApp', 'Use the authenticator app instead')
          : t('adminMfa.useBackup', 'Use a backup code instead')}
      </button>
    </form>
  );
}

function EnrolStep() {
  const { t } = useTranslation();
  const start = useAdminMfaEnrolStart();
  const confirm = useAdminMfaEnrolConfirm();
  const setMfaPassed = useAdminStore((s) => s.setMfaPassed);
  const [code, setCode] = useState('');
  const [saved, setSaved] = useState(false);

  // 3. Backup codes, shown once.
  if (confirm.data) {
    const codes = confirm.data.backupCodes;
    const download = () => {
      const blob = new Blob(
        [`Bustandeen admin backup codes\nEach code works once.\n\n${codes.join('\n')}\n`],
        { type: 'text/plain' }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bustandeen-admin-backup-codes.txt';
      a.click();
      URL.revokeObjectURL(url);
    };
    return (
      <div className="space-y-4">
        <p className="text-sm text-white/80">
          {t(
            'adminMfa.backupIntro',
            'Your authenticator is set up. Save these backup codes somewhere safe, away from your phone. Each one signs you in once if the phone is lost. They are not shown again.'
          )}
        </p>
        <ul className="grid grid-cols-2 gap-2 rounded-control bg-shade/20 p-3 font-mono text-sm text-white">
          {codes.map((c) => (
            <li key={c} className="text-center">
              {c}
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard
                ?.writeText(codes.join('\n'))
                .then(() => toast.success(t('adminMfa.copied', 'Copied')));
            }}
            className={`${BTN_SECONDARY} flex-1`}
          >
            {t('adminMfa.copy', 'Copy')}
          </button>
          <button type="button" onClick={download} className={`${BTN_SECONDARY} flex-1`}>
            {t('adminMfa.download', 'Download')}
          </button>
        </div>
        <label className="flex items-center gap-3 min-h-[44px] text-sm text-white/80 cursor-pointer">
          <input
            type="checkbox"
            checked={saved}
            onChange={(e) => setSaved(e.target.checked)}
            className="checkbox checkbox-sm checkbox-primary"
          />
          {t('adminMfa.savedCheck', 'I have saved my backup codes')}
        </label>
        <button
          type="button"
          disabled={!saved}
          onClick={setMfaPassed}
          className={`${BTN_PRIMARY} w-full`}
        >
          {t('adminMfa.enterPanel', 'Go to the admin panel')}
        </button>
      </div>
    );
  }

  // 2. Scan, then type the first code.
  if (start.data) {
    const { secret, otpauthUri } = start.data;
    const submit = (e: FormEvent) => {
      e.preventDefault();
      if (code.length !== 6) return;
      confirm.mutate(code, { onError: () => setCode('') });
    };
    return (
      <form onSubmit={submit} className="space-y-4">
        <ol className="list-decimal pl-5 space-y-1 text-sm text-white/80">
          <li>
            {t(
              'adminMfa.scan',
              'Open an authenticator app (Google Authenticator, Microsoft Authenticator, Aegis, 1Password) and scan this code.'
            )}
          </li>
          <li>{t('adminMfa.typeFirst', 'Type the 6-digit code the app shows.')}</li>
        </ol>
        <div className="grid place-items-center">
          <QrCode text={otpauthUri} />
        </div>
        <details className="text-xs text-white/70">
          <summary className="cursor-pointer min-h-[44px] flex items-center">
            {t('adminMfa.cantScan', 'Cannot scan? Enter this key in the app instead')}
          </summary>
          <p className="mt-1 break-all font-mono text-sm text-white select-all">
            {secret.replace(/(.{4})/g, '$1 ').trim()}
          </p>
          <a
            href={otpauthUri}
            className={`${TEXT_ACTION} mt-2 inline-flex min-h-[44px] items-center`}
          >
            {t('adminMfa.openApp', 'On this phone: open in the authenticator app')}
          </a>
        </details>
        <div className="space-y-1.5">
          <label htmlFor="admin-mfa-first" className={LABEL}>
            {t('adminMfa.firstCode', 'Code from the app')}
          </label>
          <CodeField id="admin-mfa-first" backup={false} value={code} onChange={setCode} />
        </div>
        {confirm.isError && <ErrorNote>{errorText(confirm.error, t)}</ErrorNote>}
        <button
          type="submit"
          disabled={confirm.isPending || code.length !== 6}
          className={`${BTN_PRIMARY} w-full`}
        >
          {confirm.isPending ? (
            <span className="loading loading-spinner loading-sm" aria-label="Checking" />
          ) : (
            t('adminMfa.turnOn', 'Turn on')
          )}
        </button>
      </form>
    );
  }

  // 1. Why, then start.
  return (
    <div className="space-y-4">
      <p className="text-sm text-white/80">
        {t(
          'adminMfa.enrolIntro',
          'Admin accounts now need a second step at sign-in: a 6-digit code from an authenticator app on your phone. A stolen password alone can no longer open the panel. Setup takes about a minute.'
        )}
      </p>
      {start.isError && <ErrorNote>{errorText(start.error, t)}</ErrorNote>}
      <button
        type="button"
        onClick={() => start.mutate()}
        disabled={start.isPending}
        className={`${BTN_PRIMARY} w-full`}
      >
        {start.isPending ? (
          <span className="loading loading-spinner loading-sm" aria-label="Starting" />
        ) : (
          t('adminMfa.setUp', 'Set up authenticator')
        )}
      </button>
    </div>
  );
}

export default function AdminMfaStep({ step }: { step: Step }) {
  const { t } = useTranslation();
  const email = useAdminStore((s) => s.email);
  const logout = useAdminLogout();

  return (
    <AuthShell>
      <AuthHero
        icon={
          step === 'enroll' ? (
            <DevicePhoneMobileIcon className="w-7 h-7" aria-hidden="true" />
          ) : (
            <KeyIcon className="w-7 h-7" aria-hidden="true" />
          )
        }
        title={
          step === 'enroll'
            ? t('adminMfa.enrolTitle', 'Set up two-step sign-in')
            : t('adminMfa.verifyTitle', 'Two-step sign-in')
        }
        subtitle={email ?? undefined}
      />
      <AuthCard>
        {step === 'enroll' ? <EnrolStep /> : <VerifyStep />}
        <button
          type="button"
          onClick={() => logout.mutate()}
          className={`${TEXT_ACTION} mt-2 w-full min-h-[44px]`}
        >
          {t('adminMfa.signOut', 'Sign out')}
        </button>
      </AuthCard>
      {/* Enrolment wants a recent password entry; the panel's own dialog
          (AdminLayout) is not mounted before the second factor passes. */}
      <AdminReauthDialog />
    </AuthShell>
  );
}
