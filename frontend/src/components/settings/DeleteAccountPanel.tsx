import { useTranslation } from 'react-i18next';
import { BTN_DANGER, BTN_QUIET } from './settingsParts.js';
import { useAccountDeletion } from './useAccountDeletion.js';

/** Delete the whole account: confirm, then verify it is really you, then erase. */
export function DeleteAccountPanel() {
  const { t } = useTranslation();
  const {
    deleteAccountStep,
    setDeleteAccountStep,
    reauthPassword,
    setReauthPassword,
    reauthError,
    setReauthError,
    reauthBusy,
    reauthMethod,
    setReauthMethod,
    hasPasswordProvider,
    canChooseReauthMethod,
    reauthWithPassword,
    reauthWithGoogle,
  } = useAccountDeletion();
  return (
    <div className="mt-4 rounded-card border border-red-400/40 bg-red-500/[0.06] p-4">
      <p className="text-red-400 font-bold text-sm mb-1">
        {t('settings.deleteAccount', 'Delete account')}
      </p>
      <p className="text-white/75 text-[11px] mb-3">
        {t(
          'settings.deleteAccountDetail',
          'Permanently removes all your data and your login. This cannot be undone.'
        )}
      </p>
      {deleteAccountStep === 'idle' && (
        <button onClick={() => setDeleteAccountStep('confirm')} className={BTN_DANGER}>
          {t('settings.deleteAccount', 'Delete account')}
        </button>
      )}
      {deleteAccountStep === 'confirm' && (
        <div className="flex gap-2 items-center flex-wrap">
          <span className="text-red-400 text-xs font-semibold">
            {t('settings.deleteAccountConfirm', 'This will erase everything. Are you sure?')}
          </span>
          <button
            onClick={() => {
              setReauthError(null);
              setDeleteAccountStep('reauth');
            }}
            className={BTN_DANGER}
          >
            {t('settings.yesDeleteAccount', 'Yes, delete my account')}
          </button>
          <button onClick={() => setDeleteAccountStep('idle')} className={BTN_QUIET}>
            {t('common.cancel')}
          </button>
        </div>
      )}
      {deleteAccountStep === 'reauth' && (
        <div className="space-y-2">
          <p className="text-white/85 text-xs">
            {t(
              'settings.reauthPrompt',
              'For your security, please verify it’s really you before we delete everything.'
            )}
          </p>
          {canChooseReauthMethod && (
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setReauthMethod('password')}
                aria-pressed={reauthMethod === 'password'}
                className={`rounded-full border px-3 py-1 text-xs font-bold ${reauthMethod === 'password' ? 'bg-red-600 border-red-600 text-on-color' : 'bg-brand-surface/50 border-brand-border text-white/75'}`}
              >
                {t('settings.reauthMethodPassword', 'Password')}
              </button>
              <button
                type="button"
                onClick={() => setReauthMethod('google')}
                aria-pressed={reauthMethod === 'google'}
                className={`rounded-full border px-3 py-1 text-xs font-bold ${reauthMethod === 'google' ? 'bg-red-600 border-red-600 text-on-color' : 'bg-brand-surface/50 border-brand-border text-white/75'}`}
              >
                {t('settings.reauthMethodGoogle', 'Google')}
              </button>
            </div>
          )}
          {(canChooseReauthMethod ? reauthMethod === 'password' : hasPasswordProvider) ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void reauthWithPassword();
              }}
              className="flex gap-2 items-center flex-wrap"
            >
              <input
                type="password"
                // eslint-disable-next-line jsx-a11y-x/no-autofocus -- appears after the user asks to confirm deletion
                autoFocus
                value={reauthPassword}
                onChange={(e) => setReauthPassword(e.target.value)}
                placeholder={t('settings.reauthPasswordPlaceholder', 'Your password')}
                className="w-44 rounded-control border border-red-400/40 bg-shade/30 px-3 py-1.5 text-sm text-white placeholder:text-white/50 focus:outline-none focus:border-red-400"
                disabled={reauthBusy}
              />
              <button type="submit" disabled={reauthBusy || !reauthPassword} className={BTN_DANGER}>
                {reauthBusy ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  t('settings.reauthAndDelete', 'Verify & delete')
                )}
              </button>
            </form>
          ) : (
            <button
              onClick={() => void reauthWithGoogle()}
              disabled={reauthBusy}
              className={BTN_DANGER}
            >
              {reauthBusy ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                t('settings.reauthWithGoogle', 'Re-verify with Google & delete')
              )}
            </button>
          )}
          {reauthError && <p className="text-red-400 text-xs font-semibold">{reauthError}</p>}
          <button
            onClick={() => {
              setReauthPassword('');
              setReauthError(null);
              setDeleteAccountStep('idle');
            }}
            className={BTN_QUIET}
          >
            {t('common.cancel')}
          </button>
        </div>
      )}
      {deleteAccountStep === 'deleting' && (
        <span className="loading loading-spinner loading-sm text-red-400" />
      )}
    </div>
  );
}
