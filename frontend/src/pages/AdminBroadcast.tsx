import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MegaphoneIcon, XMarkIcon } from '@heroicons/react/24/outline';
import AnimatedBackground from '../components/AnimatedBackground.js';
import { BTN_PRIMARY, CARD, OPTION_OFF, OPTION_ON } from '../components/bustanStyles.js';
import {
  ADMIN_INPUT_SM,
  AdminHero,
  BTN_SMALL,
  OPTION_CHIP,
} from '../components/admin/adminParts.js';
import Seo from '../components/Seo.js';
import AdminUpdateEmails from '../components/AdminUpdateEmails.js';
import {
  useAdminAnnouncements,
  useCreateAnnouncement,
  useDeactivateAnnouncement,
} from '../hooks/useAdminAnnouncements.js';

export default function AdminBroadcast() {
  const { t } = useTranslation();
  const { data: announcements, isLoading } = useAdminAnnouncements();
  const create = useCreateAnnouncement();
  const deactivate = useDeactivateAnnouncement();
  const [form, setForm] = useState({ title: '', body: '' });
  const [tab, setTab] = useState<'banner' | 'email'>('banner');

  const publish = () => {
    if (!form.title.trim() || !form.body.trim()) return;
    create.mutate(
      { title: form.title.trim(), body: form.body.trim() },
      { onSuccess: () => setForm({ title: '', body: '' }) }
    );
  };

  return (
    <AnimatedBackground variant="dark">
      <Seo
        title={t('adminBroadcast.seoTitle', 'Broadcast')}
        description="Internal dashboard."
        path="/admin/broadcast"
        index={false}
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        <AdminHero
          icon={MegaphoneIcon}
          title={t('adminBroadcast.pageTitle', 'Broadcast')}
          subtitle={t(
            'adminBroadcast.pageSubtitle',
            'Push a banner to every visitor, or send an update email.'
          )}
        />
        <div className="flex gap-2">
          {(
            [
              ['banner', 'In-app banner'],
              ['email', 'Update emails'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              aria-pressed={tab === id}
              className={`${OPTION_CHIP} !text-sm !px-4 ${tab === id ? OPTION_ON : OPTION_OFF}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'email' && <AdminUpdateEmails />}

        {tab === 'banner' && (
          <>
            <div>
              <h2 className="font-display text-xl font-bold text-white">
                {t('adminBroadcast.title', 'Broadcast announcement')}
              </h2>
              <p className="text-sm text-white/80 mt-1">
                {t(
                  'adminBroadcast.subtitle',
                  'Shows a banner at the top of every page on the public site (bustandeen.com), for signed-in and guest visitors alike. It never appears inside the admin panel. Only one can be active at a time; publishing a new one replaces it. Crossing it hides it only until the next reload; after three crossings it rests for 24 hours and then returns. Visitors can open the full text and choose "Close permanently", which removes it for good on that device (their own browser remembers, nothing is sent back to us).'
                )}
              </p>
            </div>

            <div className={`${CARD} p-4 space-y-3`}>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder={t('adminBroadcast.titlePlaceholder', 'e.g. Ramadan hours changed')}
                aria-label={t('adminBroadcast.titleLabel', 'Banner title')}
                className={`${ADMIN_INPUT_SM} w-full`}
              />
              <textarea
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                rows={3}
                aria-label={t('adminBroadcast.bodyLabel', 'Banner details')}
                placeholder={t(
                  'adminBroadcast.bodyPlaceholder',
                  'Details shown next to the title…'
                )}
                className={`${ADMIN_INPUT_SM} w-full`}
              />

              {(form.title.trim() || form.body.trim()) && (
                <div>
                  <p className="text-white/70 text-[10px] uppercase tracking-wide font-bold mb-1.5">
                    {t(
                      'adminBroadcast.previewLabel',
                      'Live preview: how it appears on the public site'
                    )}
                  </p>
                  <div className="flex items-center justify-center gap-3 px-4 py-2 bg-brand-emerald/15 border border-brand-emerald/20 rounded-control text-sm">
                    <span className="text-white/90 font-semibold truncate">
                      {form.title.trim() ||
                        t('adminBroadcast.titlePlaceholder', 'e.g. Ramadan hours changed')}
                    </span>
                    <span className="text-white/70 truncate">{form.body.trim()}</span>
                    <XMarkIcon className="w-4 h-4 text-white/70 shrink-0" />
                  </div>
                </div>
              )}

              <button
                onClick={publish}
                disabled={!form.title.trim() || !form.body.trim() || create.isPending}
                className={BTN_PRIMARY}
              >
                {create.isPending ? '…' : t('adminBroadcast.publish', 'Publish')}
              </button>
            </div>

            <section className="space-y-3">
              <h2 className="font-bold text-sm uppercase tracking-widest text-white/80">
                {t('adminBroadcast.history', 'History')}
              </h2>
              <div className={`${CARD} p-4 space-y-2`}>
                {isLoading && (
                  <p className="text-white/70 text-sm">{t('common.loading', 'Loading…')}</p>
                )}
                {!isLoading && announcements?.length === 0 && (
                  <p className="text-white/70 text-sm">
                    {t('adminBroadcast.empty', 'Nothing published yet.')}
                  </p>
                )}
                {announcements?.map((a) => (
                  <div
                    key={a._id}
                    className="flex items-start justify-between gap-3 border-b border-brand-border/60 pb-2 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="text-white font-bold text-sm">
                        {a.title}{' '}
                        {a.active && (
                          <span className="text-brand-emerald text-[10px] font-bold uppercase tracking-wide ml-1">
                            {t('adminBroadcast.active', 'active')}
                          </span>
                        )}
                      </p>
                      <p className="text-white/70 text-xs truncate">{a.body}</p>
                      <p className="text-white/70 text-[10px] mt-0.5">
                        {new Date(a.createdAt).toLocaleString()}, {a.createdBy}
                      </p>
                    </div>
                    {a.active && (
                      <button
                        onClick={() => deactivate.mutate(a._id)}
                        className={`${BTN_SMALL} shrink-0`}
                      >
                        {t('adminBroadcast.deactivate', 'Deactivate')}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </AnimatedBackground>
  );
}
