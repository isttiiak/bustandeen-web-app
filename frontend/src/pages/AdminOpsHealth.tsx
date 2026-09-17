import { useTranslation } from 'react-i18next';
import AnimatedBackground from '../components/AnimatedBackground.js';
import Seo from '../components/Seo.js';
import { useOpsHealth, useRateLimitHits } from '../hooks/useAdminOps.js';

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-bold ${
        ok ? 'bg-brand-emerald/15 text-brand-emerald' : 'bg-red-500/15 text-red-400'
      }`}
    >
      {ok ? '✓' : '✕'} {label}
    </span>
  );
}

export default function AdminOpsHealth() {
  const { t } = useTranslation();
  const { data: health, isLoading } = useOpsHealth();
  const { data: hits } = useRateLimitHits();

  return (
    <AnimatedBackground variant="dark">
      <Seo
        title={t('adminOpsHealth.seoTitle', 'System Health')}
        description="Internal dashboard."
        path="/admin/ops-health"
        index={false}
      />
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10 space-y-6">
        <h1 className="text-2xl font-black text-white">
          {t('adminOpsHealth.title', 'System & ops health')}
        </h1>

        {isLoading && <p className="text-white/40 text-sm">{t('common.loading', 'Loading…')}</p>}

        {health && (
          <>
            <section className="space-y-2">
              <h2 className="text-white font-bold text-sm uppercase tracking-widest text-white/50">
                {t('adminOpsHealth.infra', 'Infrastructure')}
              </h2>
              <div className="flex flex-wrap gap-2">
                <StatusPill ok={health.mongoConnected} label="MongoDB" />
                <StatusPill ok={health.firebaseInitialized} label="Firebase Admin" />
                {Object.entries(health.emailSendersConfigured).map(([sender, ok]) => (
                  <StatusPill key={sender} ok={ok} label={`SMTP: ${sender}`} />
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="text-white font-bold text-sm uppercase tracking-widest text-white/50">
                {t('adminOpsHealth.emailFailures', 'Recent email send failures')}
              </h2>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                {health.recentEmailFailures.length === 0 && (
                  <p className="text-white/30 text-sm">
                    {t('adminOpsHealth.noFailures', 'No failures recorded.')}
                  </p>
                )}
                <div className="space-y-2">
                  {health.recentEmailFailures.map((f, i) => (
                    <div key={i} className="border-b border-white/5 pb-2 last:border-0 last:pb-0">
                      <p className="text-white/70 text-xs">
                        <span className="font-bold">{f.sender}</span> → {f.to} · {f.subject}
                      </p>
                      <p className="text-red-400/80 text-xs font-mono mt-0.5">{f.error}</p>
                      <p className="text-white/25 text-[10px] mt-0.5">
                        {new Date(f.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}

        <section className="space-y-2">
          <h2 className="text-white font-bold text-sm uppercase tracking-widest text-white/50">
            {t('adminOpsHealth.rateLimits', 'Rate-limit hits (last 24h)')}
          </h2>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            {(!hits || hits.length === 0) && (
              <p className="text-white/30 text-sm">
                {t('adminOpsHealth.noRateLimitHits', 'Nothing throttled in the last 24 hours.')}
              </p>
            )}
            <div className="space-y-2">
              {hits?.map((h, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 border-b border-white/5 pb-2 last:border-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="text-white/70 text-xs font-bold">{h.limiterName}</p>
                    <p className="text-white/40 text-[11px] font-mono truncate">{h.path}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-brand-gold text-sm font-black">{h.count}</p>
                    <p className="text-white/25 text-[10px]">
                      {new Date(h.lastHit).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </AnimatedBackground>
  );
}
