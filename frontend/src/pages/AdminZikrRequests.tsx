import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import AnimatedBackground from '../components/AnimatedBackground.js';
import Seo from '../components/Seo.js';
import { useAdminStore } from '../store/useAdminStore.js';
import {
  useAdminZikrRequests,
  useZikrRequestEmailDraft,
  useApproveZikrRequest,
  useRejectZikrRequest,
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
  { value: 'istighfar', label: 'Istighfār — seeking forgiveness' },
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

  const startReview = (type: 'approving' | 'rejecting') => {
    setMode(type);
    setEmailText('');
    draft.mutate(
      { id: request._id, type: type === 'approving' ? 'approved' : 'rejected' },
      { onSuccess: (d) => setEmailText(d.body) }
    );
  };
  const cancel = () => {
    setMode('idle');
    setEmailText('');
    setAdminNote('');
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
    approve.mutate({ id: request._id, ...form, emailBody: emailText.trim() });
  };
  const confirmReject = () => {
    reject.mutate({
      id: request._id,
      adminNote: adminNote.trim() || undefined,
      emailBody: emailText.trim() || undefined,
    });
  };

  const sending = approve.isPending || reject.isPending;
  const isPending = request.status === 'pending';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-brand-emerald/15 bg-white/[0.03] p-4 space-y-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-white font-bold text-sm">{request.name}</p>
          {request.userEmail && <p className="text-white/40 text-xs mt-0.5">{request.userEmail}</p>}
        </div>
        <span
          className={`shrink-0 text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-full ${
            request.status === 'pending'
              ? 'bg-brand-gold/15 text-brand-gold'
              : request.status === 'approved'
                ? 'bg-brand-emerald/15 text-brand-emerald'
                : 'bg-red-500/15 text-red-400'
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
        <p className="text-white/60 text-xs leading-relaxed">{request.meaning}</p>
      )}
      {(request.source || request.sourceUrl) && (
        <a
          className="text-white/30 text-[10px] underline block"
          href={request.sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          {request.source || request.sourceUrl}
        </a>
      )}
      {request.wantsAudio && (
        <p className="text-white/30 text-[10px]">
          {t('adminZikr.wantsAudio', '🔊 Requester would like an audio recitation for this')}
        </p>
      )}

      {isPending && request.possibleDuplicateOf && (
        <div className="rounded-xl bg-brand-gold/10 border border-brand-gold/20 px-3 py-2">
          <p className="text-brand-gold text-[11px] font-bold">
            {t('adminZikr.possibleDuplicate', 'Possible duplicate')}
          </p>
          <p className="text-white/50 text-[11px] mt-0.5">
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
        <p className="text-white/30 text-[11px] italic">Note: {request.adminNote}</p>
      )}

      {isPending && mode === 'idle' && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => startReview('approving')}
            className="btn btn-xs rounded-lg bg-brand-emerald border-brand-emerald text-white font-bold"
          >
            {t('adminZikr.approve', 'Review & approve')}
          </button>
          <button
            onClick={() => startReview('rejecting')}
            className="btn btn-xs btn-ghost rounded-lg text-red-400/70 hover:text-red-400"
          >
            {request.possibleDuplicateOf
              ? t('adminZikr.rejectAsDuplicate', 'Reject as duplicate')
              : t('adminZikr.reject', 'Reject')}
          </button>
        </div>
      )}

      {mode === 'approving' && (
        <div className="space-y-2 pt-2 border-t border-brand-emerald/10">
          <p className="text-white/40 text-[10px] uppercase tracking-wide font-bold">
            {t('adminZikr.finalFields', 'Final library entry (edit as needed)')}
          </p>
          <input
            className="input input-xs w-full bg-white/5 border-brand-emerald/15 text-white rounded-lg"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <input
            dir="rtl"
            className="input input-xs w-full bg-white/5 border-brand-emerald/15 text-white rounded-lg font-serif"
            placeholder="Arabic"
            value={form.arabic}
            onChange={(e) => setForm((f) => ({ ...f, arabic: e.target.value }))}
          />
          <input
            className="input input-xs w-full bg-white/5 border-brand-emerald/15 text-white rounded-lg"
            placeholder="Transliteration (optional)"
            value={form.transliteration}
            onChange={(e) => setForm((f) => ({ ...f, transliteration: e.target.value }))}
          />
          <textarea
            className="textarea textarea-xs w-full bg-white/5 border-brand-emerald/15 text-white rounded-lg"
            placeholder="Meaning"
            rows={2}
            value={form.meaning}
            onChange={(e) => setForm((f) => ({ ...f, meaning: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              className="input input-xs w-full bg-white/5 border-brand-emerald/15 text-white rounded-lg"
              placeholder="Source (e.g. Bukhari 6306)"
              value={form.source}
              onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
            />
            <input
              className="input input-xs w-full bg-white/5 border-brand-emerald/15 text-white rounded-lg"
              placeholder="Source URL"
              value={form.sourceUrl}
              onChange={(e) => setForm((f) => ({ ...f, sourceUrl: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              className="input input-xs w-full bg-white/5 border-brand-emerald/15 text-white rounded-lg"
              placeholder="Grade (optional)"
              value={form.grade}
              onChange={(e) => setForm((f) => ({ ...f, grade: e.target.value }))}
            />
            <input
              className="input input-xs w-full bg-white/5 border-brand-emerald/15 text-white rounded-lg"
              placeholder="Virtue (optional)"
              value={form.virtue}
              onChange={(e) => setForm((f) => ({ ...f, virtue: e.target.value }))}
            />
          </div>
          <select
            className="select select-xs w-full bg-white/5 border-brand-emerald/15 text-white rounded-lg"
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
          <p className="text-white/40 text-[10px] uppercase tracking-wide font-bold pt-1">
            {t('adminZikr.emailToUser', 'Email to the requester (editable)')}
          </p>
          <textarea
            className="textarea textarea-xs w-full bg-white/5 border-brand-emerald/15 text-white rounded-lg font-mono"
            rows={6}
            value={emailText}
            onChange={(e) => setEmailText(e.target.value)}
          />
          <div className="flex gap-2 pt-1">
            <button
              onClick={confirmApprove}
              disabled={sending}
              className="btn btn-xs rounded-lg bg-brand-emerald border-brand-emerald text-white font-bold"
            >
              {approve.isPending ? '…' : t('adminZikr.confirmApprove', 'Add to library & notify')}
            </button>
            <button onClick={cancel} className="btn btn-xs btn-ghost rounded-lg text-white/50">
              {t('adminZikr.cancel', 'Cancel')}
            </button>
          </div>
        </div>
      )}

      {mode === 'rejecting' && (
        <div className="space-y-2 pt-2 border-t border-brand-emerald/10">
          <input
            className="input input-xs w-full bg-white/5 border-brand-emerald/15 text-white rounded-lg"
            placeholder={t('adminZikr.internalNote', 'Internal note (not sent)')}
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
          />
          <p className="text-white/40 text-[10px] uppercase tracking-wide font-bold">
            {t(
              'adminZikr.emailOptional',
              'Email to the requester (optional — leave blank to send nothing)'
            )}
          </p>
          <textarea
            className="textarea textarea-xs w-full bg-white/5 border-brand-emerald/15 text-white rounded-lg font-mono"
            rows={5}
            value={emailText}
            onChange={(e) => setEmailText(e.target.value)}
          />
          <div className="flex gap-2 pt-1">
            <button
              onClick={confirmReject}
              disabled={sending}
              className="btn btn-xs rounded-lg bg-red-500/80 border-red-500 text-white font-bold"
            >
              {reject.isPending ? '…' : t('adminZikr.confirmReject', 'Confirm reject')}
            </button>
            <button onClick={cancel} className="btn btn-xs btn-ghost rounded-lg text-white/50">
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
      <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-3 last:border-0 last:pb-0">
        <div className="min-w-0">
          <p className="text-white font-bold text-sm">{item.name}</p>
          <p className="text-white/40 text-xs truncate">{item.meaning}</p>
          <p className="text-white/25 text-[10px] mt-0.5">{item.category}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setEditing(true)}
            className="btn btn-xs bg-white/5 border border-white/10 text-white/60"
          >
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
            className="btn btn-xs bg-white/5 border border-red-400/20 text-red-300"
          >
            {t('adminSadaqah.delete', 'Delete')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 border-b border-white/5 pb-3 last:border-0 last:pb-0">
      <input
        className="input input-xs w-full bg-white/5 border-brand-emerald/15 text-white rounded-lg"
        placeholder="Name"
        value={form.name}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
      />
      <input
        dir="rtl"
        className="input input-xs w-full bg-white/5 border-brand-emerald/15 text-white rounded-lg font-serif"
        placeholder="Arabic"
        value={form.arabic}
        onChange={(e) => setForm((f) => ({ ...f, arabic: e.target.value }))}
      />
      <input
        className="input input-xs w-full bg-white/5 border-brand-emerald/15 text-white rounded-lg"
        placeholder="Transliteration"
        value={form.transliteration}
        onChange={(e) => setForm((f) => ({ ...f, transliteration: e.target.value }))}
      />
      <textarea
        className="textarea textarea-xs w-full bg-white/5 border-brand-emerald/15 text-white rounded-lg"
        rows={2}
        placeholder="Meaning"
        value={form.meaning}
        onChange={(e) => setForm((f) => ({ ...f, meaning: e.target.value }))}
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          className="input input-xs w-full bg-white/5 border-brand-emerald/15 text-white rounded-lg"
          placeholder="Source"
          value={form.source}
          onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
        />
        <input
          className="input input-xs w-full bg-white/5 border-brand-emerald/15 text-white rounded-lg"
          placeholder="Source URL"
          value={form.sourceUrl}
          onChange={(e) => setForm((f) => ({ ...f, sourceUrl: e.target.value }))}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          className="input input-xs w-full bg-white/5 border-brand-emerald/15 text-white rounded-lg"
          placeholder="Grade"
          value={form.grade}
          onChange={(e) => setForm((f) => ({ ...f, grade: e.target.value }))}
        />
        <input
          className="input input-xs w-full bg-white/5 border-brand-emerald/15 text-white rounded-lg"
          placeholder="Virtue"
          value={form.virtue}
          onChange={(e) => setForm((f) => ({ ...f, virtue: e.target.value }))}
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={update.isPending}
          className="btn btn-xs rounded-lg bg-brand-emerald border-brand-emerald text-white font-bold"
        >
          {update.isPending ? '…' : t('adminSadaqah.save', 'Save')}
        </button>
        <button
          onClick={() => setEditing(false)}
          className="btn btn-xs btn-ghost rounded-lg text-white/50"
        >
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
      <h2 className="text-white font-bold text-sm uppercase tracking-widest text-white/50">
        {t('adminZikrLibrary.title', 'Manage library')}
      </h2>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
        {isLoading && <p className="text-white/30 text-sm">{t('common.loading', 'Loading…')}</p>}
        {!isLoading && items?.length === 0 && (
          <p className="text-white/30 text-sm">
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
  const { data: requests, isLoading } = useAdminZikrRequests(filter === 'all' ? undefined : filter);

  return (
    <AnimatedBackground variant="dark">
      <Seo
        title={t('adminZikr.seoTitle', 'Zikr Requests Admin')}
        description="Internal dashboard."
        path="/admin/zikr-requests"
        index={false}
      />
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10 space-y-6">
        <h1 className="text-2xl font-black text-white">{t('adminZikr.title', 'Zikr Requests')}</h1>

        <div className="flex gap-2">
          {(['pending', 'approved', 'rejected', 'all'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`btn btn-xs rounded-lg ${filter === s ? 'bg-brand-emerald border-brand-emerald text-white' : 'btn-ghost text-white/50'}`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {isLoading && (
            <p className="text-white/40 text-sm">{t('adminZikr.loading', 'Loading…')}</p>
          )}
          {!isLoading && requests?.length === 0 && (
            <p className="text-white/40 text-sm">{t('adminZikr.empty', 'Nothing here.')}</p>
          )}
          {requests?.map((r) => (
            <RequestCard key={r._id} request={r} />
          ))}
        </div>

        {isServant && <ManageLibrarySection />}
      </div>
    </AnimatedBackground>
  );
}
