import { useTranslation } from 'react-i18next';
import AnimatedBackground from '../components/AnimatedBackground.js';
import Seo from '../components/Seo.js';
import {
  useOpsHealth,
  useRateLimitHits,
  useStorageUsage,
  type SenderDiagnostics,
  type StorageUsage,
} from '../hooks/useAdminOps.js';

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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StorageSection({ storage }: { storage: StorageUsage }) {
  const { t } = useTranslation();
  const pct = storage.usedRatio * 100;
  return (
    <section className="space-y-2">
      <h2 className="text-white font-bold text-sm uppercase tracking-widest text-white/50">
        {t('adminOpsHealth.storage', 'Database storage (Atlas M0 cap)')}
      </h2>
      <div
        className={`rounded-2xl border p-4 space-y-3 ${
          storage.warn ? 'border-red-500/30 bg-red-500/[0.06]' : 'border-white/10 bg-white/[0.03]'
        }`}
      >
        {storage.warn && (
          <p className="text-red-300 font-bold text-sm">
            ⚠️{' '}
            {t(
              'adminOpsHealth.storageWarn',
              'Over 70% of the 512 MB free-tier cap. Writes fail once it is full: prune old data or upgrade the cluster soon.'
            )}
          </p>
        )}
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-white text-lg font-black">
            {formatBytes(storage.totalBytes)}{' '}
            <span className="text-white/40 text-sm font-normal">
              / {formatBytes(storage.capBytes)}
            </span>
          </p>
          <p className={`text-sm font-black ${storage.warn ? 'text-red-300' : 'text-brand-gold'}`}>
            {pct < 0.1 ? '<0.1' : pct.toFixed(1)}%
          </p>
        </div>
        <div
          className="h-2 rounded-full bg-white/10 overflow-hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
          aria-label={t('adminOpsHealth.storage', 'Database storage (Atlas M0 cap)')}
        >
          <div
            className={`h-full ${storage.warn ? 'bg-red-400' : 'bg-brand-emerald'}`}
            style={{ width: `${Math.min(100, Math.max(pct, 0.5))}%` }}
          />
        </div>
        <p className="text-white/40 text-xs">
          {t('adminOpsHealth.storageBreakdown', {
            defaultValue:
              'Documents {{data}} + indexes {{index}} (uncompressed, as Atlas counts it)',
            data: formatBytes(storage.dataBytes),
            index: formatBytes(storage.indexBytes),
          })}
        </p>
        <div className="max-h-72 overflow-y-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-white/40 text-left">
                <th className="font-normal pb-1">{t('adminOpsHealth.collection', 'Collection')}</th>
                <th className="font-normal pb-1 text-right">{t('adminOpsHealth.docs', 'Docs')}</th>
                <th className="font-normal pb-1 text-right">{t('adminOpsHealth.data', 'Data')}</th>
                <th className="font-normal pb-1 text-right">
                  {t('adminOpsHealth.indexes', 'Indexes')}
                </th>
                <th className="font-normal pb-1 text-right">
                  {t('adminOpsHealth.total', 'Total')}
                </th>
              </tr>
            </thead>
            <tbody>
              {storage.collections.map((c) => (
                <tr key={c.name} className="border-t border-white/5 text-white/70">
                  <td className="py-1 font-mono truncate max-w-[10rem]">{c.name}</td>
                  <td className="py-1 text-right">{c.documents.toLocaleString()}</td>
                  <td className="py-1 text-right">{formatBytes(c.dataBytes)}</td>
                  <td className="py-1 text-right">{formatBytes(c.indexBytes)}</td>
                  <td className="py-1 text-right font-bold">{formatBytes(c.totalBytes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(storage.otherDatabases ?? []).length > 0 && (
          <div className="space-y-1 border-t border-white/10 pt-3">
            <p className="text-white/40 text-xs">
              {t(
                'adminOpsHealth.otherDatabases',
                'Other databases on the cluster (they count toward the same cap):'
              )}
            </p>
            {storage.otherDatabases.map((d) => (
              <div key={d.name} className="flex justify-between text-xs text-white/70">
                <span className="font-mono">{d.name}</span>
                <span className="font-bold">{formatBytes(d.totalBytes)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default function AdminOpsHealth() {
  const { t } = useTranslation();
  const { data: health, isLoading } = useOpsHealth();
  const { data: hits } = useRateLimitHits();
  const { data: storage } = useStorageUsage();

  // Defensive against a stale cached frontend bundle briefly calling into an
  // API response shape it wasn't built against (this page's response shape
  // has changed across a couple of quick follow-up releases) — never let a
  // missing field on `health` hard-crash the whole page.
  const senderCollisions = health?.senderCollisions ?? [];
  const emailSenders = health?.emailSenders ?? ({} as Record<string, SenderDiagnostics>);
  const recentEmailFailures = health?.recentEmailFailures ?? [];

  return (
    <AnimatedBackground variant="dark">
      <Seo
        title={t('adminOpsHealth.seoTitle', 'System Health')}
        description="Internal dashboard."
        path="/admin/ops-health"
        index={false}
      />
      <div className="max-w-5xl mx-auto px-6 py-6 sm:py-10 space-y-6">
        <h1 className="text-2xl font-black text-white">
          {t('adminOpsHealth.title', 'System & ops health')}
        </h1>

        {isLoading && <p className="text-white/40 text-sm">{t('common.loading', 'Loading…')}</p>}

        {health && (
          <>
            {senderCollisions.length > 0 && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/[0.06] p-4 space-y-2">
                <p className="text-red-300 font-bold text-sm">
                  ⚠️ {t('adminOpsHealth.collisionTitle', 'Email senders sharing one mailbox')}
                </p>
                <p className="text-white/50 text-xs leading-relaxed">
                  {t(
                    'adminOpsHealth.collisionDesc',
                    'These senders\' env vars were set to the same mailbox address — mail shows the right display name but the wrong "From" address. Each sender needs its own <SENDER>_SMTP_USER/PASS pair pointing at its own address.'
                  )}
                </p>
                {senderCollisions.map((c) => (
                  <p key={c.resolvedUser} className="text-white/70 text-xs font-mono">
                    {c.senders.join(' + ')} → <span className="text-red-300">{c.resolvedUser}</span>
                  </p>
                ))}
              </div>
            )}

            <div className="grid lg:grid-cols-2 gap-6">
              <section className="space-y-2">
                <h2 className="text-white font-bold text-sm uppercase tracking-widest text-white/50">
                  {t('adminOpsHealth.infra', 'Infrastructure')}
                </h2>
                <div className="flex flex-wrap gap-2">
                  <StatusPill ok={health.mongoConnected} label="MongoDB" />
                  <StatusPill ok={health.firebaseInitialized} label="Firebase Admin" />
                </div>
              </section>

              <section className="space-y-2">
                <h2 className="text-white font-bold text-sm uppercase tracking-widest text-white/50">
                  {t('adminOpsHealth.emailSenders', 'Email senders')}
                </h2>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-2">
                  {Object.entries(emailSenders).map(([sender, diag]) => (
                    <div
                      key={sender}
                      className="flex items-center justify-between gap-3 border-b border-white/5 pb-2 last:border-0 last:pb-0"
                    >
                      <div>
                        <p className="text-white/80 text-sm font-bold">{sender}</p>
                        <p className="text-white/40 text-xs font-mono">
                          {diag.resolvedUser ?? t('adminOpsHealth.notConfigured', 'not configured')}
                        </p>
                      </div>
                      <StatusPill
                        ok={diag.configured}
                        label={
                          diag.configured
                            ? t('adminOpsHealth.configured', 'configured')
                            : t('adminOpsHealth.missing', 'missing')
                        }
                      />
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {storage?.collections && <StorageSection storage={storage} />}

            <div className="grid lg:grid-cols-2 gap-6">
              <section className="space-y-2">
                <h2 className="text-white font-bold text-sm uppercase tracking-widest text-white/50">
                  {t('adminOpsHealth.emailFailures', 'Recent email send failures')}
                </h2>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  {recentEmailFailures.length === 0 && (
                    <p className="text-white/30 text-sm">
                      {t('adminOpsHealth.noFailures', 'No failures recorded.')}
                    </p>
                  )}
                  <div className="space-y-2">
                    {recentEmailFailures.map((f, i) => (
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

              <section className="space-y-2">
                <h2 className="text-white font-bold text-sm uppercase tracking-widest text-white/50">
                  {t('adminOpsHealth.rateLimits', 'Rate-limit hits (last 24h)')}
                </h2>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  {(!hits || hits.length === 0) && (
                    <p className="text-white/30 text-sm">
                      {t(
                        'adminOpsHealth.noRateLimitHits',
                        'Nothing throttled in the last 24 hours.'
                      )}
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
          </>
        )}
      </div>
    </AnimatedBackground>
  );
}
