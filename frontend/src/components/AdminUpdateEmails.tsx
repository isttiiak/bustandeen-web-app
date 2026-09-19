import { useMemo, useState } from 'react';
import ConfirmDialog from './ConfirmDialog.js';
import {
  useUpdateEmailAudience,
  useUpdateEmailCampaigns,
  useUpdateEmailCampaign,
  useSendUpdateEmail,
  useRetryFailedUpdateEmail,
  type NotSetMode,
  type UpdateAudience,
  type UpdateEmailCampaignSummary,
} from '../hooks/useAdminUpdateEmails.js';
import { UPDATE_EMAIL_TEMPLATES } from '../utils/updateEmailTemplates.js';

const AUDIENCE_LABEL: Record<UpdateAudience, string> = {
  brother: 'Brothers',
  sister: 'Sisters',
  all: 'All (brothers + sisters)',
};

const NOT_SET_LABEL: Record<NotSetMode, string> = {
  include: 'included',
  skip: 'skipped',
  selected: 'picked by hand',
};

function CampaignRow({ c }: { c: UpdateEmailCampaignSummary }) {
  const [open, setOpen] = useState(false);
  const detail = useUpdateEmailCampaign(open ? c._id : null);
  const [progress, setProgress] = useState<UpdateEmailCampaignSummary | null>(null);
  const retry = useRetryFailedUpdateEmail(setProgress);
  const shown = progress ?? c;

  return (
    <div className="border-b border-white/5 pb-3 last:border-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-white font-bold text-sm">{c.subject}</p>
          <p className="text-white/40 text-xs">
            {AUDIENCE_LABEL[c.audience]}, not-set accounts {NOT_SET_LABEL[c.notSetMode]}
          </p>
          <p className="text-white/25 text-[10px] mt-0.5">
            {new Date(c.createdAt).toLocaleString()} by {c.createdBy}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs font-bold text-brand-emerald">
            {shown.sent}/{shown.total} sent
          </p>
          {shown.failed > 0 && <p className="text-[11px] text-red-300">{shown.failed} failed</p>}
        </div>
      </div>
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => setOpen((v) => !v)}
          className="btn btn-xs bg-white/5 border border-white/10 text-white/60"
        >
          {open ? 'Hide recipients' : 'See recipients'}
        </button>
        {shown.failed > 0 && (
          <button
            onClick={() => retry.mutate(c._id)}
            disabled={retry.isPending}
            className="btn btn-xs bg-white/5 border border-white/10 text-white/60"
          >
            {retry.isPending ? 'Retrying…' : 'Retry failed'}
          </button>
        )}
      </div>
      {open && (
        <div className="mt-2 rounded-xl bg-black/20 p-3 space-y-2">
          {detail.isLoading && <p className="text-white/30 text-xs">Loading…</p>}
          {detail.data && (
            <>
              <pre className="whitespace-pre-wrap text-white/40 text-[11px] leading-relaxed font-sans max-h-40 overflow-y-auto">
                {detail.data.body}
              </pre>
              <ul className="max-h-56 overflow-y-auto divide-y divide-white/5">
                {detail.data.recipients.map((r) => (
                  <li key={r.uid} className="flex items-center justify-between gap-2 py-1 text-xs">
                    <span className="text-white/70 truncate">
                      {r.name || '(no name)'} <span className="text-white/30">{r.email}</span>
                    </span>
                    <span
                      className={
                        r.status === 'sent'
                          ? 'text-brand-emerald'
                          : r.status === 'failed'
                            ? 'text-red-300'
                            : 'text-white/30'
                      }
                    >
                      {r.status}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminUpdateEmails() {
  const { data: audience, isLoading: audienceLoading } = useUpdateEmailAudience();
  const { data: campaigns } = useUpdateEmailCampaigns();

  const [templateId, setTemplateId] = useState('');
  const [aud, setAud] = useState<UpdateAudience>('all');
  const [notSetMode, setNotSetMode] = useState<NotSetMode>('skip');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [progress, setProgress] = useState<UpdateEmailCampaignSummary | null>(null);
  const [error, setError] = useState('');
  const send = useSendUpdateEmail(setProgress);

  const trailer = audience?.trailer ?? '';

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    const tpl = UPDATE_EMAIL_TEMPLATES.find((t) => t.id === id);
    if (!tpl) return;
    setAud(tpl.audience);
    setSubject(tpl.subject);
    // Templates leave off the closing lines; they are added here (and again by
    // the server if they are ever deleted), so the tagline always ends the mail.
    setBody(`${tpl.body.trimEnd()}\n\n${trailer}`);
  };

  const recipientCount = useMemo(() => {
    if (!audience) return 0;
    const base =
      aud === 'brother'
        ? audience.brothers
        : aud === 'sister'
          ? audience.sisters
          : audience.brothers + audience.sisters;
    const extra =
      notSetMode === 'include' ? audience.notSet : notSetMode === 'selected' ? selected.size : 0;
    return base + extra;
  }, [audience, aud, notSetMode, selected]);

  const toggle = (uid: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });

  const canSend = !!subject.trim() && !!body.trim() && recipientCount > 0 && !send.isPending;

  const doSend = () => {
    setConfirmOpen(false);
    setError('');
    setProgress(null);
    send.mutate(
      {
        subject: subject.trim(),
        body: body.trim(),
        audience: aud,
        notSetMode,
        selectedUids: notSetMode === 'selected' ? [...selected] : undefined,
      },
      {
        onError: (err) => {
          const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
          setError(msg ?? 'Sending stopped. Check the history below, then retry the failed ones.');
        },
      }
    );
  };

  const radio =
    'flex items-center gap-2 px-3 py-2 rounded-xl border text-sm cursor-pointer transition-colors';

  return (
    <div className="space-y-6">
      <p className="text-sm text-white/50">
        Sends an update email from{' '}
        <b className="text-white/70">{audience?.sender ?? 'ansar@bustandeen.com'}</b> to the
        accounts you choose. Pick a template to fill in the audience, subject and message, then edit
        freely. <code className="text-white/60">{'{name}'}</code> becomes each person&apos;s first
        name.
      </p>

      <div className="rounded-2xl border border-brand-emerald/15 bg-brand-emerald/5 p-4 space-y-4">
        <div>
          <label className="text-white/40 text-[11px] font-bold uppercase tracking-wide">
            Template
          </label>
          <select
            value={templateId}
            onChange={(e) => applyTemplate(e.target.value)}
            className="select select-sm w-full mt-1 bg-white/5 border-brand-emerald/15 text-white rounded-xl"
          >
            <option value="">Choose a template (optional)</option>
            {UPDATE_EMAIL_TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <p className="text-white/40 text-[11px] font-bold uppercase tracking-wide mb-1.5">
            Send to
          </p>
          <div className="grid sm:grid-cols-3 gap-2">
            {(['brother', 'sister', 'all'] as const).map((a) => (
              <label
                key={a}
                className={`${radio} ${aud === a ? 'border-brand-emerald/50 bg-brand-emerald/15 text-white' : 'border-white/10 text-white/60'}`}
              >
                <input
                  type="radio"
                  name="audience"
                  checked={aud === a}
                  onChange={() => setAud(a)}
                  className="radio radio-xs"
                />
                <span>
                  {a === 'brother' ? 'Brothers' : a === 'sister' ? 'Sisters' : 'All'}
                  {audience && (
                    <span className="text-white/35">
                      {' '}
                      (
                      {a === 'brother'
                        ? audience.brothers
                        : a === 'sister'
                          ? audience.sisters
                          : audience.brothers + audience.sisters}
                      )
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="text-white/40 text-[11px] font-bold uppercase tracking-wide mb-1.5">
            Accounts with no brother/sister set{audience ? ` (${audience.notSet})` : ''}
          </p>
          <div className="grid sm:grid-cols-3 gap-2">
            {(
              [
                ['skip', 'Skip them'],
                ['include', 'Include all'],
                ['selected', 'Choose from the list'],
              ] as const
            ).map(([m, label]) => (
              <label
                key={m}
                className={`${radio} ${notSetMode === m ? 'border-brand-emerald/50 bg-brand-emerald/15 text-white' : 'border-white/10 text-white/60'}`}
              >
                <input
                  type="radio"
                  name="notset"
                  checked={notSetMode === m}
                  onChange={() => setNotSetMode(m)}
                  className="radio radio-xs"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
          {notSetMode === 'selected' && audience && (
            <div className="mt-2 rounded-xl border border-white/10 bg-black/20 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/40">{selected.size} selected</span>
                <span className="flex gap-3">
                  <button
                    className="text-brand-emerald"
                    onClick={() => setSelected(new Set(audience.notSetUsers.map((u) => u.uid)))}
                  >
                    Select all
                  </button>
                  <button className="text-white/40" onClick={() => setSelected(new Set())}>
                    None
                  </button>
                </span>
              </div>
              {audience.notSetUsers.length === 0 ? (
                <p className="text-white/30 text-xs">Everyone has a gender set.</p>
              ) : (
                <ul className="max-h-56 overflow-y-auto divide-y divide-white/5">
                  {audience.notSetUsers.map((u) => (
                    <li key={u.uid}>
                      <label className="flex items-center gap-2 py-1.5 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-xs"
                          checked={selected.has(u.uid)}
                          onChange={() => toggle(u.uid)}
                        />
                        <span className="text-white/70 truncate">
                          {u.name || '(no name)'} <span className="text-white/30">{u.email}</span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
              {audience.notSetListTruncated && (
                <p className="text-white/30 text-[11px]">
                  Showing the first {audience.notSetUsers.length}. Use Include all to reach
                  everyone.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            maxLength={200}
            className="input input-sm w-full bg-white/5 border-brand-emerald/15 text-white rounded-xl"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={14}
            placeholder="Message"
            className="textarea textarea-sm w-full bg-white/5 border-brand-emerald/15 text-white rounded-xl leading-relaxed"
          />
          {!body.trim() && trailer && (
            <button
              className="text-[11px] text-brand-emerald underline"
              onClick={() => setBody(`Assalamu alaikum {name},\n\n\n\n${trailer}`)}
            >
              Start from the standard greeting and closing lines
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-white/50 text-xs">
            {audienceLoading
              ? 'Counting…'
              : `${recipientCount} recipient${recipientCount === 1 ? '' : 's'}`}
          </p>
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={!canSend}
            className="btn btn-sm bg-brand-emerald hover:bg-brand-emerald-dim border-0 text-white disabled:opacity-40"
          >
            {send.isPending ? 'Sending…' : 'Send update'}
          </button>
        </div>

        {(send.isPending || progress) && progress && (
          <div className="rounded-xl bg-black/20 p-3 text-xs space-y-1.5">
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-brand-emerald transition-all"
                style={{ width: `${((progress.sent + progress.failed) / progress.total) * 100}%` }}
              />
            </div>
            <p className="text-white/60">
              {progress.sent} sent, {progress.failed} failed, {progress.pending} to go
              {progress.pending === 0 && !send.isPending ? '. Done.' : ''}
            </p>
          </div>
        )}
        {error && <p className="text-red-300 text-xs">{error}</p>}
      </div>

      <section className="space-y-3">
        <h2 className="text-white/50 font-bold text-sm uppercase tracking-widest">Sent updates</h2>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
          {campaigns?.length === 0 && (
            <p className="text-white/30 text-sm">No update emails sent yet.</p>
          )}
          {campaigns?.map((c) => (
            <CampaignRow key={c._id} c={c} />
          ))}
        </div>
      </section>

      <ConfirmDialog
        open={confirmOpen}
        title="Send this update?"
        message={`It will be emailed from ${audience?.sender ?? 'ansar@bustandeen.com'} to ${recipientCount} account${recipientCount === 1 ? '' : 's'}. This cannot be undone.`}
        confirmLabel="Send"
        onConfirm={doSend}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
