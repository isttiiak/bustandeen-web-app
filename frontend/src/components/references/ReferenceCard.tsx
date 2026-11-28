import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  ArrowTopRightOnSquareIcon,
  CheckBadgeIcon,
  ExclamationTriangleIcon,
  PencilSquareIcon,
  QuestionMarkCircleIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { CARD } from '../bustanStyles.js';
import { REF_PAGES } from '../../data/references/pages.js';
import { DESK_CHECK, type DeskResult, type RefKind } from '../../data/references/registry.js';
import type { ManualStatus, MappedReference } from '../../data/references/referenceExport.js';

export const KIND_KEYS: Record<RefKind, string> = {
  quran: 'references.kind.quran',
  hadith: 'references.kind.hadith',
  scholarly: 'references.kind.scholarly',
  fiqh: 'references.kind.fiqh',
  data: 'references.kind.data',
};

const KIND_FALLBACK: Record<RefKind, string> = {
  quran: 'Quran',
  hadith: 'Hadith',
  scholarly: 'Scholarly',
  fiqh: 'Fiqh position',
  data: 'Data source',
};

const DESK_TONE: Record<DeskResult, string> = {
  verified: 'border-brand-emerald/40 text-brand-emerald',
  corrected: 'border-brand-gold/50 text-brand-gold',
  weak: 'border-red-400/40 text-red-400',
  unverified: 'border-brand-border text-white/70',
};

const DESK_FALLBACK: Record<DeskResult, string> = {
  verified: 'Desk check: matches the source',
  corrected: 'Desk check: corrected in this audit',
  weak: 'Weak narration, shown as weak',
  unverified: 'Desk check incomplete',
};

const MANUAL_FALLBACK: Record<ManualStatus, string> = {
  'source-verified': 'Checked at the source',
  'scholar-confirmed': 'Confirmed by a scholar',
  'needs-correction': 'Needs correction',
};

function DeskIcon({ result }: { result: DeskResult }) {
  const cls = 'w-3.5 h-3.5 shrink-0';
  if (result === 'verified') return <CheckBadgeIcon className={cls} aria-hidden="true" />;
  if (result === 'corrected') return <PencilSquareIcon className={cls} aria-hidden="true" />;
  if (result === 'weak') return <ExclamationTriangleIcon className={cls} aria-hidden="true" />;
  return <QuestionMarkCircleIcon className={cls} aria-hidden="true" />;
}

export default function ReferenceCard({ entry }: { entry: MappedReference }) {
  const { t, i18n } = useTranslation();
  const bn = i18n.language === 'bn';
  const manual = entry.manual;

  return (
    <li className={`${CARD} p-4 space-y-2.5`} id={`ref-${entry.id.replace(/[^a-z0-9-]/gi, '-')}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          {entry.url ? (
            <a
              href={entry.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white font-bold text-sm underline underline-offset-2 decoration-brand-gold/50 hover:decoration-brand-gold inline-flex items-center gap-1"
            >
              {entry.citation}
              <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            </a>
          ) : (
            <p className="text-white font-bold text-sm">{entry.citation}</p>
          )}
          {entry.grade && entry.kind !== 'quran' && (
            <p className="text-white/70 text-xs mt-0.5">
              {t('references.grade', 'Grade')}: {entry.grade}
            </p>
          )}
        </div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-white/70 border border-brand-border rounded-full px-2 py-0.5">
          {t(KIND_KEYS[entry.kind], KIND_FALLBACK[entry.kind])}
        </span>
      </div>

      <p className="text-white/85 text-sm leading-relaxed">
        <span className="text-white/60">{t('references.purpose', 'Used for')}: </span>
        {entry.purpose}
      </p>

      {entry.pages.length > 0 && (
        <p className="text-xs text-white/70 leading-relaxed">
          <span className="text-white/60">{t('references.usedOn', 'Shown on')}: </span>
          {entry.pages.map((key, i) => {
            const page = REF_PAGES[key];
            const label = bn ? page.labelBn : page.label;
            return (
              <span key={key}>
                {i > 0 && ', '}
                {'path' in page && page.path ? (
                  <Link to={page.path} className="text-brand-emerald underline underline-offset-2">
                    {label}
                  </Link>
                ) : (
                  label
                )}
              </span>
            );
          })}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <span
          className={`inline-flex items-center gap-1 text-[11px] font-bold rounded-full border px-2 py-0.5 ${DESK_TONE[entry.desk]}`}
        >
          <DeskIcon result={entry.desk} />
          {t(`references.desk.${entry.desk}`, DESK_FALLBACK[entry.desk])}
          <span className="font-normal text-white/60">· {entry.deskDate ?? DESK_CHECK.date}</span>
        </span>
        <span
          className={`inline-flex items-center gap-1 text-[11px] font-bold rounded-full border px-2 py-0.5 ${
            manual
              ? manual.status === 'needs-correction'
                ? 'border-red-400/40 text-red-400'
                : 'border-brand-emerald/40 text-brand-emerald'
              : 'border-dashed border-brand-border text-white/60'
          }`}
        >
          <UserIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          {manual
            ? `${t(`references.manual.${manual.status}`, MANUAL_FALLBACK[manual.status])} · ${manual.by} · ${manual.date}`
            : t('references.manual.none', 'Manual check: not yet')}
        </span>
      </div>

      {(entry.deskNote || manual?.note) && (
        <div className="text-xs text-white/70 leading-relaxed space-y-1 border-t border-brand-border/60 pt-2">
          {entry.deskNote && <p>{entry.deskNote}</p>}
          {manual?.note && (
            <p>
              <span className="text-white/60">{t('references.manualNote', 'Manual note')}: </span>
              {manual.note}
            </p>
          )}
        </div>
      )}

      {entry.files.length > 0 && (
        <details className="text-[11px] text-white/60">
          <summary className="cursor-pointer min-h-[44px] flex items-center hover:text-white/80">
            {t('references.inCode', 'Where in the code ({{count}} files)', {
              count: entry.files.length,
            })}
          </summary>
          <ul className="font-mono break-all space-y-0.5 pb-1">
            {entry.files.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </details>
      )}
    </li>
  );
}
