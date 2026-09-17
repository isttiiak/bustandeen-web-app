import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AnimatedBackground from '../components/AnimatedBackground.js';
import Seo from '../components/Seo.js';
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
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-black text-white">
            {t('adminBroadcast.title', 'Broadcast announcement')}
          </h1>
          <p className="text-sm text-white/50 mt-1">
            {t(
              'adminBroadcast.subtitle',
              'Pushes a dismissible banner to every visitor — no code deploy needed. Only one can be active at a time; publishing a new one replaces it.'
            )}
          </p>
        </div>

        <div className="rounded-2xl border border-brand-emerald/15 bg-brand-emerald/5 p-4 space-y-2">
          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder={t('adminBroadcast.titlePlaceholder', 'e.g. Ramadan hours changed')}
            className="input input-sm w-full bg-white/5 border-brand-emerald/15 text-white rounded-xl"
          />
          <textarea
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            rows={3}
            placeholder={t('adminBroadcast.bodyPlaceholder', 'Details shown next to the title…')}
            className="textarea textarea-sm w-full bg-white/5 border-brand-emerald/15 text-white rounded-xl"
          />
          <button
            onClick={publish}
            disabled={!form.title.trim() || !form.body.trim() || create.isPending}
            className="btn btn-sm bg-brand-emerald hover:bg-brand-emerald-dim border-0 text-white disabled:opacity-40"
          >
            {create.isPending ? '…' : t('adminBroadcast.publish', 'Publish')}
          </button>
        </div>

        <section className="space-y-3">
          <h2 className="text-white font-bold text-sm uppercase tracking-widest text-white/50">
            {t('adminBroadcast.history', 'History')}
          </h2>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-2">
            {isLoading && (
              <p className="text-white/30 text-sm">{t('common.loading', 'Loading…')}</p>
            )}
            {!isLoading && announcements?.length === 0 && (
              <p className="text-white/30 text-sm">
                {t('adminBroadcast.empty', 'Nothing published yet.')}
              </p>
            )}
            {announcements?.map((a) => (
              <div
                key={a._id}
                className="flex items-start justify-between gap-3 border-b border-white/5 pb-2 last:border-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="text-white font-bold text-sm">
                    {a.title}{' '}
                    {a.active && (
                      <span className="text-brand-emerald text-[10px] font-black uppercase tracking-wide ml-1">
                        {t('adminBroadcast.active', 'active')}
                      </span>
                    )}
                  </p>
                  <p className="text-white/40 text-xs truncate">{a.body}</p>
                  <p className="text-white/25 text-[10px] mt-0.5">
                    {new Date(a.createdAt).toLocaleString()} — {a.createdBy}
                  </p>
                </div>
                {a.active && (
                  <button
                    onClick={() => deactivate.mutate(a._id)}
                    className="btn btn-xs bg-white/5 border border-white/10 text-white/60 shrink-0"
                  >
                    {t('adminBroadcast.deactivate', 'Deactivate')}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </AnimatedBackground>
  );
}
