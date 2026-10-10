import { useState } from 'react';
import { m as motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import AnimatedBackground from '../components/AnimatedBackground.js';
import { BTN_PRIMARY, CARD, OPTION_OFF, OPTION_ON } from '../components/bustanStyles.js';
import {
  ADMIN_INPUT_SM,
  AdminHero,
  BTN_DANGER,
  BTN_SMALL,
  OPTION_CHIP,
} from '../components/admin/adminParts.js';
import { InboxStackIcon, SpeakerWaveIcon } from '@heroicons/react/24/outline';
import Seo from '../components/Seo.js';
import { useAdminStore } from '../store/useAdminStore.js';
import {
  useAdminZikrRequests,
  useZikrRequestEmailDraft,
  useApproveZikrRequest,
  useRejectZikrRequest,
  useReopenZikrRequest,
  useAdminZikrLibrary,
  useUpdateLibraryItem,
  useDeleteLibraryItem,
  type GlobalLibraryItem,
} from '../hooks/useAdminZikr.js';
import type {
  GlobalZikrCategory,
  ZikrRequest,
  ZikrRequestStatus,
} from '../hooks/useZikrRequests.js';

type ReviewMode = 'idle' | 'approving' | 'rejecting';

const CATEGORY_OPTIONS: { value: GlobalZikrCategory; label: string }[] = [
  { value: 'uncategorized', label: 'Uncategorized' },
  { value: 'tasbih', label: 'Tasbīḥ & praise' },
  { value: 'istighfar', label: 'Istighfār: seeking forgiveness' },
  { value: 'salawat', label: 'Ṣalawāt upon the Prophet ﷺ' },
  { value: 'kalimat', label: 'The weighty words' },
  { value: 'asma', label: 'Calling on His Names' },
  { value: 'protection', label: 'Morning · evening · protection' },
];

function RequestCard({ request }: { request: ZikrRequest }) {
  const { t } = useTranslation();
  const draft = useZikrRequestEmailDraft();
  const approve = useApproveZikrRequest();
  const reject = useRejectZikrRequest();
  const reopen = useReopenZikrRequest();
  const isServant = useAdminStore((s) => s.role) === 'servant';
  const [confirmReopen, setConfirmReopen] = useState(false);
  const [mode, setMode] = useState<ReviewMode>('idle');
  const [emailText, setEmailText] = useState('');
  const [adminNote, setAdminNote] = useState('');

  // Admin can correct/complete anything the user submitted before it becomes
  // the canonical library entry — the request is a suggestion, not the
  // final text.
  const [form, setForm] = useState({
    name: request.name,
    arabic: request.arabic ?? '',
    transliteration: '',
    meaning: request.meaning ?? '',
    source: request.source ?? '',
    sourceUrl: request.sourceUrl ?? '',
    grade: '',
    virtue: '',
    category: 'uncategorized' as GlobalZikrCategory,
  });
  const [audioAdded, setAudioAdded] = useState(false);

  const loadDraft = (type: 'approved' | 'rejected') =>
    draft.mutate({ id: request._id, type }, { onSuccess: (d) => setEmailText(d.body) });

  // Approve starts with the suggested email; Reject starts blank (sends
  // nothing) and the admin can insert the suggestion on purpose.
  const startReview = (type: 'approving' | 'rejecting') => {
    setMode(type);
    setEmailText('');
    if (type === 'approving') loadDraft('approved');
  };
  const cancel = () => {
    setMode('idle');
    setEmailText('');
    setAdminNote('');
    setAudioAdded(false);
  };

  // The review decision (approve/reject) always goes through regardless of
  // the email — this only warns the admin that the requester was never
  // actually notified, so they know to follow up.
  const warnIfEmailFailed = (res: { emailSent: boolean }) => {
    if (!res.emailSent) {
      toast.error(
        t(
          'adminZikr.emailFailedWarning',
          'Saved, but the email to the requester failed to send. Check System & ops health.'
        )
      );
    }
  };

  const confirmApprove = () => {
    if (
      !form.name.trim() ||
      !form.arabic.trim() ||
      !form.meaning.trim() ||
      !form.source.trim() ||
      !form.sourceUrl.trim()
    )
      return;
    approve.mutate(
      { id: request._id, ...form, audioAdded, emailBody: emailText.trim() },
      { onSuccess: warnIfEmailFailed }
    );
  };
  const confirmReject = () => {
    reject.mutate(
      {
        id: request._id,
        adminNote: adminNote.trim() || undefined,
        emailBody: emailText.trim() || undefined,
      },
      { onSuccess: warnIfEmailFailed }
    );
  };

  const sending = approve.isPending || reject.isPending;
  const isPending = request.status === 'pending';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${CARD} p-4 space-y-3`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-white font-bold text-sm">{request.name}</p>
          {request.userEmail && <p className="text-white/70 text-xs mt-0.5">{request.userEmail}</p>}
        </div>
        <span
          className={`shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full ${
            request.status === 'pending'
              ? 'bg-brand-gold/15 text-brand-gold'
              : request.status === 'approved'
                ? 'bg-brand-emerald/15 text-brand-emerald'
                : 'bg-red-400/15 text-red-400'
          }`}
        >
          {request.status}
        </span>
      </div>

      {request.arabic && (
        <p dir="rtl" lang="ar" className="text-brand-emerald/80 font-serif text-base leading-loose">
          {request.arabic}
        </p>
      )}
      {request.meaning && (
        <p className="text-white/70 text-xs leading-relaxed">{request.meaning}</p>
      )}
      {(request.source || request.sourceUrl) && (
        <a
          className="text-white/70 text-[10px] underline block"
          href={request.sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          {request.source || request.sourceUrl}
        </a>
      )}
      {request.wantsAudio && (
        <p className="flex items-center gap-1.5 text-brand-gold text-[11px] font-bold">
          <SpeakerWaveIcon className="w-3.5 h-3.5" aria-hidden="true" />
          {t('adminZikr.wantsAudio', 'Requester would like an audio recitation for this')}
          {request.status === 'approved' &&
            (request.audioAdded
              ? ` · ${t('adminZikr.audioDone', 'audio added')}`
              : ` · ${t('adminZikr.audioNotYet', 'audio not added yet')}`)}
        </p>
      )}

      {isPending && request.possibleDuplicateOf && (
        <div className="rounded-control bg-brand-gold/10 border border-brand-gold/20 px-3 py-2">
          <p className="text-brand-gold text-[11px] font-bold">
            {t('adminZikr.possibleDuplicate', 'Possible duplicate')}
          </p>
          <p className="text-white/70 text-[11px] mt-0.5">
            {t('adminZikr.possibleDuplicateOf', 'Looks similar to an existing entry: "{{name}}"', {
              name: request.possibleDuplicateOf.name,
            })}
            {request.possibleDuplicateOfModel === 'GlobalZikrLibraryItem' && (
              <>
                {' '}
                <a
                  className="underline"
                  href={`/settings#zikr-lib-${request.possibleDuplicateOf._id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('adminZikr.viewExisting', 'View')}
                </a>
              </>
            )}
          </p>
        </div>
      )}

      {!isPending && request.adminNote && (
        <p className="text-white/70 text-[11px] italic">Note: {request.adminNote}</p>
      )}
      {!isPending && request.reviewedBy && (
        <p className="text-white/70 text-[11px]">
          {t('adminZikr.reviewedBy', 'Reviewed by')} {request.reviewedBy}
        </p>
      )}

      {!isPending && isServant && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (!confirmReopen) return setConfirmReopen(true);
              setConfirmReopen(false);
              reopen.mutate(request._id, {
                onError: () => toast.error(t('adminZikr.reopenFailed', 'Could not reopen it.')),
              });
            }}
            disabled={reopen.isPending}
            className={`text-[11px] ${confirmReopen ? 'text-brand-gold font-bold' : 'text-white/70 hover:text-white'}`}
            title={t(
              'adminZikr.reopenHint',
              'Back to the queue, for a decision taken by mistake. No email is sent.'
            )}
          >
            {confirmReopen
              ? request.status === 'approved'
                ? t(
                    'adminZikr.confirmReopenApproved',
                    'Reopen and remove it from the library? Click again.'
                  )
                : t('adminZikr.confirmReopen', 'Reopen? Click again.')
              : t('adminZikr.reopen', 'Reopen')}
          </button>
          {confirmReopen && (
            <button
              onClick={() => setConfirmReopen(false)}
              className="text-[11px] text-white/70 hover:text-white"
            >
              {t('adminZikr.cancel', 'Cancel')}
            </button>
          )}
        </div>
      )}

      {isPending && mode === 'idle' && (
        <div className="flex gap-2 pt-1">
          <button onClick={() => startReview('approving')} className={BTN_PRIMARY}>
            {t('adminZikr.approve', 'Review & approve')}
          </button>
          <button onClick={() => startReview('rejecting')} className={BTN_DANGER}>
            {request.possibleDuplicateOf
              ? t('adminZikr.rejectAsDuplicate', 'Reject as duplicate')
              : t('adminZikr.reject', 'Reject')}
          </button>
        </div>
      )}

      {mode === 'approving' && (
        <div className="space-y-2 pt-2 border-t border-brand-emerald/10">
          <p className="text-white/70 text-[10px] uppercase tracking-wide font-bold">
            {t('adminZikr.finalFields', 'Final library entry (edit as needed)')}
          </p>
          <input
            className={`${ADMIN_INPUT_SM} w-full`}
            placeholder="Name"
            aria-label="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <input
            dir="rtl"
            className={`${ADMIN_INPUT_SM} w-full`}
            placeholder="Arabic"
            aria-label="Arabic"
            value={form.arabic}
            onChange={(e) => setForm((f) => ({ ...f, arabic: e.target.value }))}
          />
          <input
            className={`${ADMIN_INPUT_SM} w-full`}
            placeholder="Transliteration (optional)"
            aria-label="Transliteration (optional)"
            value={form.transliteration}
            onChange={(e) => setForm((f) => ({ ...f, transliteration: e.target.value }))}
          />
          <textarea
            className={`${ADMIN_INPUT_SM} w-full`}
            placeholder="Meaning"
            aria-label="Meaning"
            rows={2}
            value={form.meaning}
            onChange={(e) => setForm((f) => ({ ...f, meaning: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              className={`${ADMIN_INPUT_SM} w-full`}
              placeholder="Source (e.g. Bukhari 6306)"
              aria-label="Source (e.g. Bukhari 6306)"
              value={form.source}
              onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
            />
            <input
              className={`${ADMIN_INPUT_SM} w-full`}
              placeholder="Source URL"
              aria-label="Source URL"
              value={form.sourceUrl}
              onChange={(e) => setForm((f) => ({ ...f, sourceUrl: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              className={`${ADMIN_INPUT_SM} w-full`}
              placeholder="Grade (optional)"
              aria-label="Grade (optional)"
              value={form.grade}
              onChange={(e) => setForm((f) => ({ ...f, grade: e.target.value }))}
            />
            <input
              className={`${ADMIN_INPUT_SM} w-full`}
              placeholder="Virtue (optional)"
              aria-label="Virtue (optional)"
              value={form.virtue}
              onChange={(e) => setForm((f) => ({ ...f, virtue: e.target.value }))}
            />
          </div>
          <select
            className={`${ADMIN_INPUT_SM} w-full`}
            value={form.category}
            onChange={(e) =>
              setForm((f) => ({ ...f, category: e.target.value as GlobalZikrCategory }))
            }
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <label className="flex items-start gap-2 text-white/70 text-xs pt-1">
            <input
              type="checkbox"
              className="checkbox checkbox-xs mt-0.5"
              checked={audioAdded}
              onChange={(e) => setAudioAdded(e.target.checked)}
            />
            <span>
              {t(
                'adminZikr.audioAddedCheck',
                'Audio recitation has been added to the app for this zikr'
              )}
              {request.wantsAudio && (
                <span className="text-brand-gold/70">
                  {' '}
                  ({t('adminZikr.audioRequested', 'requested')})
                </span>
              )}
              <span className="block text-white/70 text-[10px]">
                {t(
                  'adminZikr.audioAddedHint',
                  'Adds one line about the audio above the sign-off of the email.'
                )}
              </span>
            </span>
          </label>
          <p className="text-white/70 text-[10px] uppercase tracking-wide font-bold pt-1">
            {t('adminZikr.emailToUser', 'Email to the requester (editable)')}
          </p>
          <textarea
            className={`${ADMIN_INPUT_SM} w-full font-mono`}
            rows={6}
            value={emailText}
            onChange={(e) => setEmailText(e.target.value)}
          />
          <div className="flex gap-2 pt-1">
            <button onClick={confirmApprove} disabled={sending} className={BTN_PRIMARY}>
              {approve.isPending ? '…' : t('adminZikr.confirmApprove', 'Add to library & notify')}
            </button>
            <button onClick={cancel} className={BTN_SMALL}>
              {t('adminZikr.cancel', 'Cancel')}
            </button>
          </div>
        </div>
      )}

      {mode === 'rejecting' && (
        <div className="space-y-2 pt-2 border-t border-brand-emerald/10">
          <input
            className={`${ADMIN_INPUT_SM} w-full`}
            placeholder={t('adminZikr.internalNote', 'Internal note (not sent)')}
            aria-label={t('adminZikr.internalNote', 'Internal note (not sent)')}
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
          />
          <p className="text-white/70 text-[10px] uppercase tracking-wide font-bold">
            {t(
              'adminZikr.emailOptional',
              'Email to the requester (optional, leave blank to send nothing)'
            )}
          </p>
          <textarea
            className={`${ADMIN_INPUT_SM} w-full font-mono`}
            rows={5}
            aria-label={t('adminZikr.rejectEmailLabel', 'Email to the requester')}
            value={emailText}
            onChange={(e) => setEmailText(e.target.value)}
          />
          {!emailText.trim() && (
            <button
              type="button"
              onClick={() => loadDraft('rejected')}
              disabled={draft.isPending}
              className={BTN_SMALL}
            >
              {draft.isPending ? '…' : t('adminZikr.insertDraft', 'Insert suggested email')}
            </button>
          )}
          <div className="flex gap-2 pt-1">
            <button onClick={confirmReject} disabled={sending} className={BTN_DANGER}>
              {reject.isPending
                ? '…'
                : emailText.trim()
                  ? t('adminZikr.confirmRejectEmail', 'Reject and send email')
                  : t('adminZikr.confirmRejectSilent', 'Reject without email')}
            </button>
            <button onClick={cancel} className={BTN_SMALL}>
              {t('adminZikr.cancel', 'Cancel')}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function LibraryItemRow({ item }: { item: GlobalLibraryItem }) {
  const { t } = useTranslation();
  const update = useUpdateLibraryItem();
  const del = useDeleteLibraryItem();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: item.name,
    arabic: item.arabic,
    transliteration: item.transliteration ?? '',
    meaning: item.meaning,
    source: item.source,
    sourceUrl: item.sourceUrl,
    grade: item.grade ?? '',
    virtue: item.virtue ?? '',
  });

  const save = () => {
    update.mutate({ id: item._id, ...form }, { onSuccess: () => setEditing(false) });
  };

  if (!editing) {
    return (
      <div className="flex items-start justify-between gap-3 border-b border-brand-border/60 pb-3 last:border-0 last:pb-0">
        <div className="min-w-0">
          <p className="text-white font-bold text-sm">{item.name}</p>
          <p className="text-white/70 text-xs truncate">{item.meaning}</p>
          <p className="text-white/70 text-[10px] mt-0.5">{item.category}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => setEditing(true)} className={BTN_SMALL}>
            {t('adminSadaqah.edit', 'Edit')}
          </button>
          <button
            onClick={() => {
              if (
                confirm(
                  t('adminZikrLibrary.confirmDelete', 'Delete this library entry permanently?')
                )
              )
                del.mutate(item._id);
            }}
            className={BTN_DANGER}
          >
            {t('adminSadaqah.delete', 'Delete')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 border-b border-brand-border/60 pb-3 last:border-0 last:pb-0">
      <input
        className={`${ADMIN_INPUT_SM} w-full`}
        placeholder="Name"
        aria-label="Name"
        value={form.name}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
      />
      <input
        dir="rtl"
        className={`${ADMIN_INPUT_SM} w-full`}
        placeholder="Arabic"
        aria-label="Arabic"
        value={form.arabic}
        onChange={(e) => setForm((f) => ({ ...f, arabic: e.target.value }))}
      />
      <input
        className={`${ADMIN_INPUT_SM} w-full`}
        placeholder="Transliteration"
        aria-label="Transliteration"
        value={form.transliteration}
        onChange={(e) => setForm((f) => ({ ...f, transliteration: e.target.value }))}
      />
      <textarea
        className={`${ADMIN_INPUT_SM} w-full`}
        rows={2}
        placeholder="Meaning"
        aria-label="Meaning"
        value={form.meaning}
        onChange={(e) => setForm((f) => ({ ...f, meaning: e.target.value }))}
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          className={`${ADMIN_INPUT_SM} w-full`}
          placeholder="Source"
          aria-label="Source"
          value={form.source}
          onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
        />
        <input
          className={`${ADMIN_INPUT_SM} w-full`}
          placeholder="Source URL"
          aria-label="Source URL"
          value={form.sourceUrl}
          onChange={(e) => setForm((f) => ({ ...f, sourceUrl: e.target.value }))}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          className={`${ADMIN_INPUT_SM} w-full`}
          placeholder="Grade"
          aria-label="Grade"
          value={form.grade}
          onChange={(e) => setForm((f) => ({ ...f, grade: e.target.value }))}
        />
        <input
          className={`${ADMIN_INPUT_SM} w-full`}
          placeholder="Virtue"
          aria-label="Virtue"
          value={form.virtue}
          onChange={(e) => setForm((f) => ({ ...f, virtue: e.target.value }))}
        />
      </div>
      <div className="flex gap-2">
        <button onClick={save} disabled={update.isPending} className={BTN_PRIMARY}>
          {update.isPending ? '…' : t('adminSadaqah.save', 'Save')}
        </button>
        <button onClick={() => setEditing(false)} className={BTN_SMALL}>
          {t('adminZikr.cancel', 'Cancel')}
        </button>
      </div>
    </div>
  );
}

function ManageLibrarySection() {
  const { t } = useTranslation();
  const { data: items, isLoading } = useAdminZikrLibrary();

  return (
    <section className="space-y-3">
      <h2 className="font-bold text-sm uppercase tracking-widest text-white/80">
        {t('adminZikrLibrary.title', 'Manage library')}
      </h2>
      <div className={`${CARD} p-4 space-y-3`}>
        {isLoading && <p className="text-white/70 text-sm">{t('common.loading', 'Loading…')}</p>}
        {!isLoading && items?.length === 0 && (
          <p className="text-white/70 text-sm">
            {t('adminZikrLibrary.empty', 'No published library entries yet.')}
          </p>
        )}
        {items?.map((item) => (
          <LibraryItemRow key={item._id} item={item} />
        ))}
      </div>
    </section>
  );
}

export default function AdminZikrRequests() {
  const { t } = useTranslation();
  const isServant = useAdminStore((s) => s.role) === 'servant';
  const [filter, setFilter] = useState<ZikrRequestStatus | 'all'>('pending');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAdminZikrRequests(filter === 'all' ? undefined : filter, page);
  const requests = data?.requests;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <AnimatedBackground variant="dark">
      <Seo
        title={t('adminZikr.seoTitle', 'Zikr Requests Admin')}
        description="Internal dashboard."
        path="/admin/zikr-requests"
        index={false}
      />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        <AdminHero icon={InboxStackIcon} title={t('adminZikr.title', 'Zikr Requests')} />

        <div className="flex gap-2">
          {(['pending', 'approved', 'rejected', 'all'] as const).map((s) => (
            <button
              key={s}
              onClick={() => {
                setFilter(s);
                setPage(1);
              }}
              aria-pressed={filter === s}
              className={`${OPTION_CHIP} ${filter === s ? OPTION_ON : OPTION_OFF}`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {isLoading && (
            <p className="text-white/70 text-sm">{t('adminZikr.loading', 'Loading…')}</p>
          )}
          {!isLoading && requests?.length === 0 && (
            <p className="text-white/70 text-sm">{t('adminZikr.empty', 'Nothing here.')}</p>
          )}
          {requests?.map((r) => (
            <RequestCard key={r._id} request={r} />
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 text-sm text-white/70">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className={`${OPTION_CHIP} ${OPTION_OFF} disabled:opacity-50`}
            >
              {t('adminUsers.prev', 'Prev')}
            </button>
            <span>
              {t('adminUsers.pageOf', 'Page {{page}} of {{total}}', { page, total: totalPages })}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className={`${OPTION_CHIP} ${OPTION_OFF} disabled:opacity-50`}
            >
              {t('adminUsers.next', 'Next')}
            </button>
          </div>
        )}

        {isServant && <ManageLibrarySection />}
      </div>
    </AnimatedBackground>
  );
}
