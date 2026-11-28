import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import AnimatedBackground from '../components/AnimatedBackground.js';
import Seo from '../components/Seo.js';
import { AdminHero } from '../components/admin/adminParts.js';
import { BTN_PRIMARY, BTN_SECONDARY, CARD } from '../components/bustanStyles.js';
import {
  mappedReferences,
  type ManualCheck,
  type ManualStatus,
} from '../data/references/referenceExport.js';
import { publicSiteUrl } from '../utils/siteLinks.js';

// The manual-check drafting tool (owner's choice, 2026-11-28): the marks
// live in frontend/src/data/references/manualChecks.json, so they ship with
// the code and reach the native app through /references.json. This page only
// drafts them: marks are kept in this browser until you copy the file out.
// Nothing is sent to the server.

const DRAFT_KEY = 'bustandeen_admin_reference_marks';
const ALL = mappedReferences();
const FIELD =
  'min-h-[44px] px-3 py-2 rounded-control bg-brand-surface border border-brand-border text-white text-sm placeholder:text-white/60 focus:outline-none focus:border-brand-emerald focus:ring-2 focus:ring-brand-emerald/30';
const STATUSES: { value: ManualStatus; label: string }[] = [
  { value: 'source-verified', label: 'Checked at the source' },
  { value: 'scholar-confirmed', label: 'Confirmed by a scholar' },
  { value: 'needs-correction', label: 'Needs correction' },
];

type Drafts = Record<string, ManualCheck | null>;

function loadDrafts(): Drafts {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Drafts) : {};
  } catch {
    return {};
  }
}

const today = () => new Date().toISOString().slice(0, 10);

export default function AdminReferences() {
  const { t } = useTranslation();
  const [drafts, setDrafts] = useState<Drafts>(loadDrafts);
  const [by, setBy] = useState('');
  const [query, setQuery] = useState('');
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  const save = (next: Drafts) => {
    setDrafts(next);
    localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
    setCopied(false);
  };

  /** The file's marks with this browser's drafts on top (null = remove). */
  const merged = useMemo(() => {
    const out: Record<string, ManualCheck> = {};
    for (const r of ALL) {
      const d = r.id in drafts ? drafts[r.id] : r.manual;
      if (d) out[r.id] = d;
    }
    return out;
  }, [drafts]);

  const fileText = JSON.stringify(merged, null, 2) + '\n';
  const pending = Object.keys(drafts).length;

  const shown = ALL.filter((r) => {
    if (onlyOpen && merged[r.id]) return false;
    const q = query.trim().toLowerCase();
    return !q || `${r.citation} ${r.purpose} ${r.id}`.toLowerCase().includes(q);
  });

  const mark = (id: string, status: ManualStatus | '', note?: string) => {
    if (!status) return save({ ...drafts, [id]: null });
    const prev = merged[id];
    const text = (note ?? prev?.note ?? '').trim();
    save({
      ...drafts,
      [id]: {
        status,
        by: by.trim() || prev?.by || 'Istiak',
        date: today(),
        ...(text ? { note: text } : {}),
      },
    });
  };

  const copy = async () => {
    await navigator.clipboard.writeText(fileText);
    setCopied(true);
  };

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
            'Mark a reference once you have opened the source yourself or a scholar has confirmed it. Marks stay in this browser until you copy them into the code.'
          )}
        />

        <section className={`${CARD} p-4 space-y-3 text-sm text-white/80`}>
          <ol className="list-decimal pl-5 space-y-1 text-xs leading-relaxed">
            <li>Open the source link, read it (or ask a scholar), then choose a status below.</li>
            <li>
              Press <b>Copy manualChecks.json</b> and replace{' '}
              <code className="text-brand-gold">
                frontend/src/data/references/manualChecks.json
              </code>{' '}
              with it.
            </li>
            <li>
              Run <code className="text-brand-gold">npm run refs:update --prefix frontend</code>,
              commit and ship. The public page and /references.json then show the mark.
            </li>
          </ol>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={by}
              onChange={(e) => setBy(e.target.value)}
              placeholder="Checked by (your name, or the scholar's)"
              aria-label="Checked by"
              className={`${FIELD} flex-1 min-w-[220px]`}
            />
            <button type="button" onClick={copy} className={BTN_PRIMARY}>
              {copied ? 'Copied' : 'Copy manualChecks.json'}
            </button>
            {pending > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Discard ${pending} draft mark(s) in this browser?`)) save({});
                }}
                className={BTN_SECONDARY}
              >
                Discard drafts ({pending})
              </button>
            )}
          </div>
          <p className="text-xs text-white/60">
            {Object.keys(merged).length} of {ALL.length} references marked · {pending} unsaved draft
            {pending === 1 ? '' : 's'} ·{' '}
            <a href={`${publicSiteUrl().replace(/\/$/, '')}/references`} className="underline">
              public page
            </a>
          </p>
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
            Only unmarked
          </label>
        </div>

        <ul className="space-y-2">
          {shown.map((r) => {
            const m = merged[r.id];
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
                      {r.id in drafts && <span className="text-brand-gold"> · draft</span>}
                    </p>
                  </div>
                  <select
                    value={m?.status ?? ''}
                    onChange={(e) => mark(r.id, e.target.value as ManualStatus | '')}
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
                {r.deskNote && <p className="text-white/60 text-xs">{r.deskNote}</p>}
                {r.places.length > 0 && (
                  <p className="text-white/70 text-xs">
                    Shown in:{' '}
                    {r.places
                      .map((p) => `${p.page} › ${p.section}${p.item ? ` › ${p.item}` : ''}`)
                      .join(' · ')}
                  </p>
                )}
                {r.files.length > 0 && (
                  <details className="text-[11px] text-white/60">
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
                {m && (
                  <input
                    defaultValue={m.note ?? ''}
                    onBlur={(e) => {
                      if (e.target.value !== (m.note ?? '')) mark(r.id, m.status, e.target.value);
                    }}
                    placeholder="Note (what you checked, which edition, the scholar's words)"
                    aria-label={`Note for ${r.citation}`}
                    className={`${FIELD} w-full`}
                  />
                )}
                {m && (
                  <p className="text-[11px] text-white/60">
                    {m.by} · {m.date}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </AnimatedBackground>
  );
}
