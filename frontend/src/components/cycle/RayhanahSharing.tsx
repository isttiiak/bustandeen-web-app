import { useTranslation } from 'react-i18next';
import {
  HeartIcon,
  LockClosedIcon,
  UserCircleIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { BTN_PRIMARY, CARD } from '../bustanStyles.js';
import Switch from '../Switch.js';
import { formatDay } from './rayhanahShared.js';
import { type RayhanahPage } from './useRayhanahPage.js';

export default function RayhanahSharing({ page }: { page: RayhanahPage }) {
  const { t } = useTranslation();
  const {
    summary,
    partnerSync,
    setPregnancy,
    partnerPickerOpen,
    setPartnerPickerOpen,
    friends,
    pregnancyFormOpen,
    setPregnancyFormOpen,
    dueDateInput,
    setDueDateInput,
  } = page;

  return (
    <section className={`${CARD} p-5 space-y-4`}>
      {/* ── Partner sync: opt-in, revocable, status-only ── */}
      <div>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-white font-bold text-sm flex items-center gap-1.5">
              <UserGroupIcon className="w-4 h-4 text-brand-pink" />
              {t('rayhanah.partnerSyncTitle', 'Share cycle status')}
            </p>
            <p className="text-white/70 text-xs leading-relaxed mt-0.5">
              {t(
                'rayhanah.partnerSyncDesc',
                'One friend sees only "on her cycle" or "not", never dates, symptoms, or notes. Turn off anytime.'
              )}
            </p>
          </div>
          <Switch
            aria-label={t('rayhanah.partnerSyncTitle', 'Share cycle status')}
            tone="pink"
            size="sm"
            checked={summary?.partnerSync?.enabled ?? false}
            disabled={partnerSync.isPending}
            onChange={(e) => {
              if (e.target.checked) {
                setPartnerPickerOpen(true);
              } else {
                partnerSync.mutate({ enabled: false });
                setPartnerPickerOpen(false);
              }
            }}
          />
        </div>

        {summary?.partnerSync?.enabled && summary.partnerSync?.partnerUid && (
          <p className="text-brand-emerald text-xs mt-2">
            {t('rayhanah.sharingWith', 'Currently sharing with {{name}}', {
              name:
                friends?.find((f) => f.uid === summary.partnerSync?.partnerUid)?.displayName ??
                t('rayhanah.aFriend', 'a friend'),
            })}
          </p>
        )}

        {partnerPickerOpen && !summary?.partnerSync?.enabled && (
          <div className="mt-2 space-y-1.5">
            {!friends?.length ? (
              <p className="text-white/70 text-xs">
                {t(
                  'rayhanah.partnerSyncNoFriends',
                  'Connect with a friend on the Friends page first, then come back here.'
                )}
              </p>
            ) : (
              friends.map((f) => (
                <button
                  key={f.uid}
                  className="w-full flex items-center gap-2 rounded-control border border-brand-border bg-brand-surface/50 hover:border-brand-pink/40 px-3 py-2 text-xs text-white/85 text-left transition-colors"
                  onClick={() => {
                    partnerSync.mutate({ enabled: true, partnerUid: f.uid });
                    setPartnerPickerOpen(false);
                  }}
                >
                  <UserCircleIcon className="w-4 h-4 shrink-0 text-white/70" />
                  <span className="truncate">{f.displayName}</span>
                </button>
              ))
            )}
            <button
              className="text-white/70 text-xs hover:text-white"
              onClick={() => setPartnerPickerOpen(false)}
            >
              {t('common.cancel', 'Cancel')}
            </button>
          </div>
        )}
      </div>

      {/* ── Pregnancy: pauses hayd predictions only; salat/fasting unaffected ── */}
      <div className="pt-4 border-t border-brand-border">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-white font-bold text-sm flex items-center gap-1.5">
              <HeartIcon className="w-4 h-4 text-brand-emerald" />
              {t('rayhanah.pregnancyToggleTitle', "I'm currently pregnant")}
            </p>
            <p className="text-white/70 text-xs leading-relaxed mt-0.5">
              {t(
                'rayhanah.pregnancyToggleDesc',
                'Pauses period predictions and shows a week count instead. Does not change your salat or fasting tracking.'
              )}
            </p>
          </div>
          <Switch
            aria-label={t('rayhanah.pregnancyToggleTitle', "I'm currently pregnant")}
            size="sm"
            checked={summary?.pregnancy?.active ?? false}
            disabled={setPregnancy.isPending}
            onChange={(e) => {
              if (e.target.checked) {
                setDueDateInput(summary?.pregnancy.dueDate ?? '');
                setPregnancyFormOpen(true);
              } else {
                setPregnancy.mutate({ active: false });
                setPregnancyFormOpen(false);
              }
            }}
          />
        </div>

        {pregnancyFormOpen && !summary?.pregnancy?.active && (
          <div className="mt-2 flex items-center gap-2">
            <input
              type="date"
              aria-label={t('rayhanah.pregnancyDueDateLabel', 'Expected due date')}
              className="input input-sm rounded-control bg-brand-surface/50 border-brand-border text-white flex-1"
              value={dueDateInput}
              onChange={(e) => setDueDateInput(e.target.value)}
            />
            <button
              className={`${BTN_PRIMARY} py-1.5`}
              disabled={!dueDateInput || setPregnancy.isPending}
              onClick={() => {
                setPregnancy.mutate({ active: true, dueDate: dueDateInput });
                setPregnancyFormOpen(false);
              }}
            >
              {t('rayhanah.pregnancySave', 'Save')}
            </button>
            <button
              className="text-white/70 text-xs hover:text-white"
              onClick={() => setPregnancyFormOpen(false)}
            >
              {t('common.cancel', 'Cancel')}
            </button>
          </div>
        )}
        {!pregnancyFormOpen && summary?.pregnancy?.active && summary.pregnancy.dueDate && (
          <p className="text-brand-emerald text-xs mt-2">
            {t('rayhanah.pregnancyDueDate', 'Expected due date: {{date}}', {
              date: formatDay(summary.pregnancy.dueDate),
            })}
          </p>
        )}
      </div>

      <p className="text-white/70 text-[11px] leading-relaxed border-t border-brand-border pt-4 flex gap-2">
        <LockClosedIcon className="w-4 h-4 shrink-0 text-brand-emerald" />
        <span>
          {t(
            'rayhanah.privacyNote',
            'Your cycle data is visible only to you. It is never shown to friends, unless you choose to share a simple yes or no with one friend. In your friends’ circle your Noor simply flows from the dhikr, Quran and ṣalawāt you do, like any other day.'
          )}
        </span>
      </p>
    </section>
  );
}
