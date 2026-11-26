import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BTN_PRIMARY, CARD } from '../../bustanStyles.js';
import { ADMIN_INPUT_SM, BTN_DANGER, BTN_SMALL } from '../adminParts.js';
import {
  useAdminQuarterlyList,
  useDeleteQuarterly,
  usePublishQuarterly,
  useQuarterlyPreview,
  useUnpublishQuarterly,
} from '../../../hooks/useAdminSadaqah.js';

/** Current quarter as 'YYYY-Qn' — the default starting point for the
 *  publish flow, since publishing last quarter's final numbers is the most
 *  common action but any quarter string can be typed in. */
function currentQuarter(): string {
  const now = new Date();
  return `${now.getFullYear()}-Q${Math.floor(now.getMonth() / 3) + 1}`;
}

export function QuarterlyPublisher() {
  const { t } = useTranslation();
  const { data: quarterlyList } = useAdminQuarterlyList();
  const preview = useQuarterlyPreview();
  const publish = usePublishQuarterly();
  const unpublish = useUnpublishQuarterly();
  const deleteQuarterly = useDeleteQuarterly();

  const [quarter, setQuarter] = useState(currentQuarter());
  const [notes, setNotes] = useState('');
  const [previewData, setPreviewData] = useState<{ received: number; spent: number } | null>(null);

  const runPreview = () => {
    if (!/^\d{4}-Q[1-4]$/.test(quarter)) return;
    setPreviewData(null);
    preview.mutate(quarter, { onSuccess: (d) => setPreviewData(d) });
  };

  // Publishing puts the figures on the public page and deleting removes them for good, so each
  // asks first (audit P2-8). Delete also needs a recent password entry, which the panel asks for.
  const ask = (key: string, fallback: string, quarterName: string) =>
    window.confirm(t(key, fallback, { quarter: quarterName }));

  const confirmPublish = () => {
    if (
      !ask(
        'adminSadaqah.publishConfirm',
        'Publish {{quarter}}? Its received and spent figures become visible on the public sadaqah page.',
        quarter
      )
    )
      return;
    publish.mutate(
      { quarter, notes: notes.trim() || undefined },
      { onSuccess: () => setPreviewData(null) }
    );
  };

  const publishListed = (q: string) => {
    if (
      ask(
        'adminSadaqah.publishConfirm',
        'Publish {{quarter}}? Its received and spent figures become visible on the public sadaqah page.',
        q
      )
    )
      publish.mutate({ quarter: q });
  };

  const unpublishListed = (q: string) => {
    if (
      ask(
        'adminSadaqah.unpublishConfirm',
        'Unpublish {{quarter}}? It disappears from the public sadaqah page until you publish it again.',
        q
      )
    )
      unpublish.mutate(q);
  };

  const deleteListed = (q: string) => {
    if (
      ask(
        'adminSadaqah.deleteQuarterConfirm',
        'Delete the {{quarter}} report for good? This cannot be undone.',
        q
      )
    )
      deleteQuarterly.mutate(q);
  };

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-white font-bold text-sm uppercase tracking-widest text-white/70">
          {t('adminSadaqah.quarterlyTitle', 'Quarterly public report')}
        </h2>
        <p className="text-white/70 text-xs mt-0.5">
          {t(
            'adminSadaqah.quarterlyNote',
            'Received and spent are always computed fresh from verified donations and the expense ledger. Nothing here is typed in by hand. Nothing shows on the public page until you publish.'
          )}
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className={`${CARD} p-4 space-y-2`}>
          <p className="text-white/70 text-xs font-bold uppercase tracking-wide">
            {t('adminSadaqah.publishedQuarters', 'Quarters')}
          </p>
          {quarterlyList?.length === 0 && (
            <p className="text-white/70 text-sm">{t('adminSadaqah.noQuarters', 'None yet.')}</p>
          )}
          {quarterlyList?.map((q) => (
            <div
              key={q.quarter}
              className="flex items-center justify-between gap-3 border-b border-brand-border/60 pb-2 last:border-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="text-white font-bold text-sm">
                  {q.quarter}{' '}
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wide ml-1 ${
                      q.published ? 'text-brand-emerald' : 'text-white/70'
                    }`}
                  >
                    {q.published
                      ? t('adminSadaqah.published', 'published')
                      : t('adminSadaqah.draft', 'draft')}
                  </span>
                </p>
                <p className="text-white/70 text-xs truncate">
                  +{q.received.toLocaleString()} / -{q.spent.toLocaleString()}
                  {q.notes ? ` · ${q.notes}` : ''}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                {q.published ? (
                  <button onClick={() => unpublishListed(q.quarter)} className={BTN_SMALL}>
                    {t('adminSadaqah.unpublish', 'Unpublish')}
                  </button>
                ) : (
                  <button onClick={() => publishListed(q.quarter)} className={BTN_SMALL}>
                    {t('adminSadaqah.publish', 'Publish')}
                  </button>
                )}
                <button onClick={() => deleteListed(q.quarter)} className={BTN_DANGER}>
                  {t('adminSadaqah.delete', 'Delete')}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className={`${CARD} p-4 space-y-2 h-fit`}>
          <p className="text-white/70 text-xs font-bold">
            {t('adminSadaqah.previewPublish', 'Preview & publish a quarter')}
          </p>
          <input
            value={quarter}
            onChange={(e) => {
              setQuarter(e.target.value);
              setPreviewData(null);
            }}
            placeholder="2026-Q3"
            aria-label="2026-Q3"
            className={`${ADMIN_INPUT_SM} w-full`}
          />
          <button
            onClick={runPreview}
            disabled={!/^\d{4}-Q[1-4]$/.test(quarter) || preview.isPending}
            className={BTN_SMALL}
          >
            {preview.isPending ? '…' : t('adminSadaqah.calculate', 'Calculate')}
          </button>

          {previewData && (
            <div className="rounded-control bg-shade/20 px-3 py-2 text-sm">
              <p className="text-white">
                {t('adminSadaqah.received', 'Received')}:{' '}
                <span className="font-bold text-brand-emerald">
                  {previewData.received.toLocaleString()}
                </span>
              </p>
              <p className="text-white">
                {t('adminSadaqah.spent', 'Spent')}:{' '}
                <span className="font-bold text-brand-gold">
                  {previewData.spent.toLocaleString()}
                </span>
              </p>
            </div>
          )}

          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t(
              'adminSadaqah.notesPlaceholder',
              'Notes (e.g. server costs, qari recording)'
            )}
            aria-label={t(
              'adminSadaqah.notesPlaceholder',
              'Notes (e.g. server costs, qari recording)'
            )}
            className={`${ADMIN_INPUT_SM} w-full`}
          />
          <button
            onClick={confirmPublish}
            disabled={!previewData || publish.isPending}
            className={BTN_PRIMARY}
          >
            {publish.isPending ? '…' : t('adminSadaqah.publish', 'Publish')}
          </button>
        </div>
      </div>
    </section>
  );
}
