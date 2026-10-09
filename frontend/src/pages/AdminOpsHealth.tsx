import { useTranslation } from 'react-i18next';
import AnimatedBackground from '../components/AnimatedBackground.js';
import { CARD } from '../components/bustanStyles.js';
import {
  CheckIcon,
  ExclamationTriangleIcon,
  HeartIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import Seo from '../components/Seo.js';
import { AdminHero } from '../components/admin/adminParts.js';
import {
  useOpsHealth,
  useRateLimitHits,
  useStorageUsage,
  useCspViolations,
  type CspViolationReport,
  type SenderDiagnostics,
  type StorageUsage,
} from '../hooks/useAdminOps.js';

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
        ok ? 'bg-brand-emerald/15 text-brand-emerald' : 'bg-red-400/15 text-red-400'
      }`}
    >
      {ok ? (
        <CheckIcon className="w-3.5 h-3.5" aria-label="OK" />
      ) : (
        <XMarkIcon className="w-3.5 h-3.5" aria-label="Down" />
      )}
      {label}
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
      <h2 className="font-bold text-sm uppercase tracking-widest text-white/80">
        {t('adminOpsHealth.storage', 'Database storage (Atlas M0 cap)')}
      </h2>
      <div
        className={`rounded-card border p-4 space-y-3 ${
          storage.warn
            ? 'border-red-400/40 bg-red-400/5 shadow-elev-2'
            : 'border-brand-border bg-brand-deep shadow-elev-2'
        }`}
      >
        {storage.warn && (
          <p className="flex items-start gap-1.5 text-red-400 font-bold text-sm">
            <ExclamationTriangleIcon className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            {t(
              'adminOpsHealth.storageWarn',
              'Over 70% of the 512 MB free-tier cap. Writes fail once it is full: prune old data or upgrade the cluster soon.'
            )}
          </p>
        )}
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-white text-lg font-bold">
            {formatBytes(storage.totalBytes)}{' '}
            <span className="text-white/70 text-sm font-normal">
              / {formatBytes(storage.capBytes)}
            </span>
          </p>
          <p className={`text-sm font-bold ${storage.warn ? 'text-red-400' : 'text-brand-gold'}`}>
            {pct < 0.1 ? '<0.1' : pct.toFixed(1)}%
          </p>
        </div>
        <div
          className="h-2 rounded-full bg-brand-border overflow-hidden"
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
        <p className="text-white/70 text-xs">
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
              <tr className="text-white/70 text-left">
                <th className="font-normal pb-1">{t('adminOpsHealth.collection', 'Collection')}</th>
                <th className="font-normal pb-1 pl-3 text-right">
                  {t('adminOpsHealth.docs', 'Docs')}
                </th>
                {/* Data + Indexes only from sm: at 375px five columns wrapped
                    every "123.4 KB" onto two lines. The line above the table
                    already gives both totals. */}
                <th className="hidden sm:table-cell font-normal pb-1 pl-3 text-right">
                  {t('adminOpsHealth.data', 'Data')}
                </th>
                <th className="hidden sm:table-cell font-normal pb-1 pl-3 text-right">
                  {t('adminOpsHealth.indexes', 'Indexes')}
                </th>
                <th className="font-normal pb-1 pl-3 text-right">
                  {t('adminOpsHealth.total', 'Total')}
                </th>
              </tr>
            </thead>
            <tbody>
              {storage.collections.map((c) => (
                <tr key={c.name} className="border-t border-brand-border/60 text-white/70">
                  <td className="py-1 font-mono break-all">{c.name}</td>
                  <td className="py-1 pl-3 text-right whitespace-nowrap">
                    {c.documents.toLocaleString()}
                  </td>
                  <td className="hidden sm:table-cell py-1 pl-3 text-right whitespace-nowrap">
                    {formatBytes(c.dataBytes)}
                  </td>
                  <td className="hidden sm:table-cell py-1 pl-3 text-right whitespace-nowrap">
                    {formatBytes(c.indexBytes)}
                  </td>
                  <td className="py-1 pl-3 text-right font-bold whitespace-nowrap">
                    {formatBytes(c.totalBytes)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(storage.otherDatabases ?? []).length > 0 && (
          <div className="space-y-1 border-t border-brand-border pt-3">
            <p className="text-white/70 text-xs">
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

/** CSP reports per UTC day, origins only (audit T1.3b): reviewed for a week
 *  before the Report-Only header in vercel.json is switched to enforcing. */
function CspSection({ report }: { report: CspViolationReport }) {
  const { t } = useTranslation();
  const total = report.daily.reduce((sum, d) => sum + d.count, 0);
  return (
    <section className="space-y-2">
      <h2 className="font-bold text-sm uppercase tracking-widest text-white/80">
        {t('adminOpsHealth.cspTitle', 'CSP violation reports (last 7 days, UTC)')}
      </h2>
      <div className={`${CARD} p-4 space-y-3`}>
        <p className="text-white/70 text-xs leading-relaxed">
          {t(
            'adminOpsHealth.cspDesc',
            'Counted per day from {{since}}, origins only (kept 30 days). The policy is still Report-Only: anything legitimate here must be allowed in vercel.json before enforcing.',
            { since: report.sinceDay }
          )}
        </p>
        {total === 0 ? (
          <p className="text-white/70 text-sm">
            {t('adminOpsHealth.cspNone', 'No violations reported in this period.')}
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {report.daily.map((d) => (
                <span
                  key={d.day}
                  className="rounded-control border border-brand-border px-2 py-1 text-[11px] font-mono text-white/70"
                >
                  {d.day}: <span className="text-brand-gold font-bold">{d.count}</span>
                </span>
              ))}
            </div>
            <div className="space-y-2">
              {report.top.map((r) => (
                <div
                  key={`${r.directive}|${r.blocked}|${r.source}|${r.disposition}`}
                  className="flex items-center justify-between gap-3 border-b border-brand-border/60 pb-2 last:border-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="text-white/70 text-xs font-bold font-mono">
                      {r.directive}
                      {r.disposition !== 'report' && (
                        <span className="text-red-400"> ({r.disposition})</span>
                      )}
                    </p>
                    <p className="text-white/70 text-[11px] font-mono truncate">
                      {r.blocked} {t('adminOpsHealth.cspFrom', 'from')} {r.source}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-brand-gold text-sm font-bold">{r.count}</p>
                    <p className="text-white/70 text-[10px]">
                      {t('adminOpsHealth.cspDays', '{{count}} day(s)', { count: r.days })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
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
  const { data: csp } = useCspViolations();

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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        <AdminHero icon={HeartIcon} title={t('adminOpsHealth.title', 'System & ops health')} />

        {isLoading && <p className="text-white/70 text-sm">{t('common.loading', 'Loading…')}</p>}

        {health && (
          <>
            {senderCollisions.length > 0 && (
              <div className="rounded-card border border-red-400/40 bg-red-400/5 shadow-elev-2 p-4 space-y-2">
                <p className="flex items-center gap-1.5 text-red-400 font-bold text-sm">
                  <ExclamationTriangleIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  {t('adminOpsHealth.collisionTitle', 'Email senders sharing one mailbox')}
                </p>
                <p className="text-white/70 text-xs leading-relaxed">
                  {t(
                    'adminOpsHealth.collisionDesc',
                    'These senders\' env vars were set to the same mailbox address: mail shows the right display name but the wrong "From" address. Each sender needs its own <SENDER>_SMTP_USER/PASS pair pointing at its own address.'
                  )}
                </p>
                {senderCollisions.map((c) => (
                  <p key={c.resolvedUser} className="text-white/70 text-xs font-mono">
                    {c.senders.join(' + ')} to{' '}
                    <span className="text-red-400">{c.resolvedUser}</span>
                  </p>
                ))}
              </div>
            )}

            <div className="grid lg:grid-cols-2 gap-6">
              <section className="space-y-2">
                <h2 className="font-bold text-sm uppercase tracking-widest text-white/80">
                  {t('adminOpsHealth.infra', 'Infrastructure')}
                </h2>
                <div className="flex flex-wrap gap-2">
                  <StatusPill ok={health.mongoConnected} label="MongoDB" />
                  <StatusPill ok={health.firebaseInitialized} label="Firebase Admin" />
                </div>
              </section>

              <section className="space-y-2">
                <h2 className="font-bold text-sm uppercase tracking-widest text-white/80">
                  {t('adminOpsHealth.emailSenders', 'Email senders')}
                </h2>
                <div className={`${CARD} p-4 space-y-2`}>
                  {Object.entries(emailSenders).map(([sender, diag]) => (
                    <div
                      key={sender}
                      className="flex items-center justify-between gap-3 border-b border-brand-border/60 pb-2 last:border-0 last:pb-0"
                    >
                      <div>
                        <p className="text-white/80 text-sm font-bold">{sender}</p>
                        <p className="text-white/70 text-xs font-mono">
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

            {csp?.daily && <CspSection report={csp} />}

            <div className="grid lg:grid-cols-2 gap-6">
              <section className="space-y-2">
                <h2 className="font-bold text-sm uppercase tracking-widest text-white/80">
                  {t('adminOpsHealth.emailFailures', 'Recent email send failures')}
                </h2>
                <div className={`${CARD} p-4`}>
                  {recentEmailFailures.length === 0 && (
                    <p className="text-white/70 text-sm">
                      {t('adminOpsHealth.noFailures', 'No failures recorded.')}
                    </p>
                  )}
                  <div className="space-y-2">
                    {recentEmailFailures.map((f, i) => (
                      <div
                        key={i}
                        className="border-b border-brand-border/60 pb-2 last:border-0 last:pb-0"
                      >
                        <p className="text-white/70 text-xs">
                          <span className="font-bold">{f.sender}</span> to {f.to} · {f.subject}
                        </p>
                        <p className="text-red-400 text-xs font-mono mt-0.5">{f.error}</p>
                        <p className="text-white/70 text-[10px] mt-0.5">
                          {new Date(f.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="space-y-2">
                <h2 className="font-bold text-sm uppercase tracking-widest text-white/80">
                  {t('adminOpsHealth.rateLimits', 'Rate-limit hits (last 24h)')}
                </h2>
                <div className={`${CARD} p-4`}>
                  {(!hits || hits.length === 0) && (
                    <p className="text-white/70 text-sm">
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
                        className="flex items-center justify-between gap-3 border-b border-brand-border/60 pb-2 last:border-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <p className="text-white/70 text-xs font-bold">{h.limiterName}</p>
                          <p className="text-white/70 text-[11px] font-mono truncate">{h.path}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-brand-gold text-sm font-bold">{h.count}</p>
                          <p className="text-white/70 text-[10px]">
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
