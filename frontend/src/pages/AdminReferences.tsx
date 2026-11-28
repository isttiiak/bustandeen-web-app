import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import AnimatedBackground from '../components/AnimatedBackground.js';
import ConfirmDialog from '../components/ConfirmDialog.js';
import Seo from '../components/Seo.js';
import { AdminHero } from '../components/admin/adminParts.js';
import { CARD } from '../components/bustanStyles.js';
import {
  mappedReferences,
  type ManualStatus,
  type MappedReference,
} from '../data/references/referenceExport.js';
import {
  useAdminReferenceChecks,
  useClearReferenceCheck,
  useSaveReferenceCheck,
} from '../hooks/useReferenceChecks.js';
import { publicSiteUrl } from '../utils/siteLinks.js';

// Manual checks on the reference map (/references), Servant only. A change
// saves to the server at once (ReferenceCheck, audit-logged with the values
// before and after) and shows on the public page within a minute. The
// reference list itself ships with the code (data/references/registry.ts).

const BY_KEY = 'bustandeen_admin_reference_by';
const FIELD =
  'min-h-[44px] px-3 py-2 rounded-control bg-brand-surface border border-brand-border text-white text-sm placeholder:text-white/70 focus:outline-none focus:border-brand-emerald focus:ring-2 focus:ring-brand-emerald/30';
const STATUSES: { value: ManualStatus; label: string }[] = [
  { value: 'source-verified', label: 'Checked at the source' },
  { value: 'scholar-confirmed', label: 'Confirmed by a scholar' },
  { value: 'needs-correction', label: 'Needs correction' },
];

/** Today in the admin's own calendar (the day the check was made). */
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function AdminReferences() {
  const { t } = useTranslation();
  const { data: checks, isLoading, isError } = useAdminReferenceChecks();
  const save = useSaveReferenceCheck();
  const clear = useClearReferenceCheck();
  const [by, setBy] = useState(() => localStorage.getItem(BY_KEY) ?? '');
  const [query, setQuery] = useState('');
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [toClear, setToClear] = useState<MappedReference | null>(null);

  const all = useMemo(() => mappedReferences(checks ?? {}), [checks]);
  const marked = all.filter((r) => r.manual).length;
  const q = query.trim().toLowerCase();
  const shown = all.filter(
    (r) =>
      !(onlyOpen && r.manual) &&
      (!q || `${r.citation} ${r.purpose} ${r.id}`.toLowerCase().includes(q))
  );

  const mark = (r: MappedReference, status: ManualStatus, note?: string) => {
    const who = by.trim() || r.manual?.by || 'Istiak';
    const text = (note ?? r.manual?.note ?? '').trim();
    save.mutate({
      refId: r.id,
      status,
      by: who,
      date: today(),
      ...(text ? { note: text } : {}),
    });
  };

  const error = save.error ?? clear.error;

  return (
    <AnimatedBackground variant="dark">
      <Seo
        title={t('adminReferences.seoTitle', 'Reference checks')}
        description="Internal dashboard."
        path="/admin/references"
        index={false}
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-5">
        <AdminHero
          icon={ClipboardDocumentCheckIcon}
          title={t('adminReferences.title', 'Reference checks')}
          subtitle={t(
            'adminReferences.subtitle',
            'Open the source yourself or ask a scholar, then mark the reference. It saves at once and shows on the public reference map.'
          )}
        />

        <section className={`${CARD} p-4 space-y-3 text-sm text-white/80`}>
          <input
            value={by}
            onChange={(e) => {
              setBy(e.target.value);
              localStorage.setItem(BY_KEY, e.target.value);
            }}
            placeholder="Checked by (your name, or the scholar's)"
            aria-label="Checked by"
            className={`${FIELD} w-full`}
          />
          <p className="text-xs text-white/70">
            {isLoading
              ? 'Loading the checks… '
              : `${marked} of ${all.length} references checked by hand. `}
            <a href={`${publicSiteUrl().replace(/\/$/, '')}/references`} className="underline">
              Open the public page
            </a>
          </p>
          {isError && (
            <p className="text-xs text-red-400">Could not load the saved checks. Try again.</p>
          )}
          {error && (
            <p className="text-xs text-red-400" role="alert">
              Not saved: {error instanceof Error ? error.message : 'try again'}.
            </p>
          )}
        </section>

        <div className="flex flex-wrap gap-2 items-center">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search citation, purpose or id"
            aria-label="Search references"
            className={`${FIELD} flex-1 min-w-[220px]`}
          />
          <label className="min-h-[44px] inline-flex items-center gap-2 text-sm text-white/80">
            <input
              type="checkbox"
              checked={onlyOpen}
              onChange={(e) => setOnlyOpen(e.target.checked)}
              className="checkbox checkbox-sm"
            />
            Only unchecked
          </label>
        </div>

        <ul className="space-y-2">
          {shown.map((r) => {
            const m = r.manual;
            const busy =
              (save.isPending && save.variables?.refId === r.id) ||
              (clear.isPending && clear.variables === r.id);
            return (
              <li key={r.id} className={`${CARD} p-3 space-y-2`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    {r.url ? (
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white font-bold text-sm underline underline-offset-2"
                      >
                        {r.citation}
                      </a>
                    ) : (
                      <p className="text-white font-bold text-sm">{r.citation}</p>
                    )}
                    <p className="text-white/70 text-xs mt-0.5">
                      {r.grade ? `${r.grade} · ` : ''}desk: {r.desk}
                      {busy && <span className="text-brand-gold"> · saving</span>}
                    </p>
                  </div>
                  <select
                    value={m?.status ?? ''}
                    disabled={busy}
                    onChange={(e) => {
                      const v = e.target.value as ManualStatus | '';
                      if (v) mark(r, v);
                      else if (m) setToClear(r);
                    }}
                    aria-label={`Manual check for ${r.citation}`}
                    className={FIELD}
                  >
                    <option value="">Not checked</option>
                    {STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-white/80 text-xs leading-relaxed">{r.purpose}</p>
                {r.deskNote && <p className="text-white/70 text-xs">{r.deskNote}</p>}
                {r.places.length > 0 && (
                  <p className="text-white/70 text-xs">
                    Shown in:{' '}
                    {r.places
                      .map((p) => `${p.page} › ${p.section}${p.item ? ` › ${p.item}` : ''}`)
                      .join(' · ')}
                  </p>
                )}
                {m && (
                  <>
                    <input
                      key={`${r.id}-${m.date}-${m.note ?? ''}`}
                      defaultValue={m.note ?? ''}
                      onBlur={(e) => {
                        if (e.target.value.trim() !== (m.note ?? '')) {
                          mark(r, m.status, e.target.value);
                        }
                      }}
                      placeholder="Note: what you checked, which edition, the scholar's words"
                      aria-label={`Note for ${r.citation}`}
                      className={`${FIELD} w-full`}
                    />
                    <p className="text-[11px] text-white/70">
                      {m.by} · {m.date}
                    </p>
                  </>
                )}
                {r.files.length > 0 && (
                  <details className="text-[11px] text-white/70">
                    <summary className="cursor-pointer min-h-[44px] flex items-center">
                      Code files ({r.files.length})
                    </summary>
                    <ul className="font-mono break-all space-y-0.5 pb-1">
                      {r.files.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <ConfirmDialog
        open={toClear !== null}
        title="Clear this check?"
        message={
          toClear
            ? `${toClear.citation} will show "Manual check: not yet" on the public page again. The audit log keeps what it was.`
            : ''
        }
        confirmLabel="Clear the check"
        onConfirm={() => {
          if (toClear) clear.mutate(toClear.id);
          setToClear(null);
        }}
        onCancel={() => setToClear(null)}
      />
    </AnimatedBackground>
  );
}
