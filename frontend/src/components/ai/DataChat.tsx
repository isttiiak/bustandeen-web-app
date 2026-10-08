import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { BTN_PRIMARY } from '../bustanStyles.js';
import { AiPanel, AiBadge, AiSendsLink, AiThinking } from './AiFlair.js';
import {
  useAskNaseeh,
  useDataAnswer,
  type DataQueryId,
  type DataPeriod,
  type PrayerId,
} from '../../hooks/useNaseeh.js';
import { useAuthStore } from '../../store/useAuthStore.js';

interface Chip {
  key: string;
  label: string;
  vars: { query: DataQueryId; period?: DataPeriod; prayer?: PrayerId };
}

interface Turn {
  id: number;
  question: string;
  answer: string;
  answered: boolean;
}

/** Read-only Q&A about the user's own numbers. Not a fiqh chat: the model only
 * picks which lookup to run, and the answer is built from the database. The
 * conversation lives in memory only and is gone when the page closes. */
export default function DataChat() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const aiEnabled = useAuthStore((s) => s.aiEnabled);
  const ask = useAskNaseeh();
  const lookup = useDataAnswer();
  const [text, setText] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const nextId = useRef(1);

  if (!user || !aiEnabled) return null;

  const chips: Chip[] = [
    {
      key: 'missedWeek',
      label: t('naseehChat.qMissedWeek', 'How many prayers did I miss this week?'),
      vars: { query: 'salat_missed', period: 'week' },
    },
    {
      key: 'fajrMonth',
      label: t('naseehChat.qFajrMonth', 'How many Fajr did I miss this month?'),
      vars: { query: 'salat_missed', period: 'month', prayer: 'fajr' },
    },
    {
      key: 'streak',
      label: t('naseehChat.qStreak', 'What is my prayer streak?'),
      vars: { query: 'salat_streak' },
    },
    {
      key: 'kaza',
      label: t('naseehChat.qKaza', 'How many make-up prayers do I owe?'),
      vars: { query: 'kaza_owed' },
    },
    {
      key: 'zikr',
      label: t('naseehChat.qZikr', 'How much dhikr did I count this week?'),
      vars: { query: 'zikr_total', period: 'week' },
    },
    {
      key: 'quran',
      label: t('naseehChat.qQuran', 'How much Quran did I read this month?'),
      vars: { query: 'quran_read', period: 'month' },
    },
    {
      key: 'fasts',
      label: t('naseehChat.qFasts', 'How many fasts did I complete this year?'),
      vars: { query: 'fasting_days', period: 'year' },
    },
  ];

  const busy = ask.isPending || lookup.isPending;
  const failMsg = t('naseehChat.error', "That didn't load. Please try again in a moment.");
  // A typed question needs one AI request; the quick questions never do.
  const askFailMsg = t(
    'naseehChat.askError',
    "Naseeh couldn't answer that just now. The quick questions above still work: they don't use AI."
  );

  const push = (question: string, answer: string, answered: boolean) =>
    setTurns((prev) => [...prev, { id: nextId.current++, question, answer, answered }].slice(-6));

  const onChip = (c: Chip) => {
    if (busy) return;
    lookup.mutate(c.vars, {
      onSuccess: (r) => push(c.label, r.answer || failMsg, !!r.answer && r.answered),
      onError: () => push(c.label, failMsg, false),
    });
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = text.trim();
    if (q.length < 2 || busy) return;
    setText('');
    ask.mutate(q, {
      onSuccess: (r) => push(q, r.answer || failMsg, !!r.answer && r.answered),
      onError: () => push(q, askFailMsg, false),
    });
  };

  return (
    <AiPanel>
      <div className="p-4 space-y-3">
        <AiBadge label={t('naseehChat.badge', 'Naseeh · ask about my data')} />
        <p className="text-white/70 text-xs leading-relaxed">
          {t(
            'naseehChat.intro',
            'Ask about your own numbers: prayers, dhikr, Quran, fasting and make-up prayers. Answers come straight from your logs. This is not a place for rulings.'
          )}
        </p>

        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label={t('naseehChat.quick', 'Quick questions')}
        >
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              disabled={busy}
              onClick={() => onChip(c)}
              className="text-xs rounded-control border border-brand-border bg-brand-surface/50 hover:border-brand-emerald/40 hover:bg-brand-surface disabled:opacity-40 text-white/80 px-2.5 py-1.5 transition-colors text-left"
            >
              {c.label}
            </button>
          ))}
        </div>

        {turns.length > 0 && (
          <div className="space-y-3" aria-live="polite">
            {turns.map((turn) => (
              <div key={turn.id} className="space-y-1.5">
                <p className="text-white/60 text-xs text-right">{turn.question}</p>
                <p
                  className={`text-sm leading-relaxed rounded-control px-3 py-2 ${
                    turn.answered
                      ? 'bg-brand-emerald/10 border border-brand-emerald/25 text-white'
                      : 'bg-shade/20 border border-brand-border text-white/70'
                  }`}
                >
                  {turn.answer}
                </p>
              </div>
            ))}
          </div>
        )}

        {busy && <AiThinking label={t('naseehChat.thinking', 'Checking your logs…')} />}

        <form onSubmit={onSubmit} className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={200}
            placeholder={t('naseehChat.placeholder', 'e.g. How many Asr did I miss this week?')}
            aria-label={t('naseehChat.inputLabel', 'Ask a question about your own data')}
            className="input input-sm flex-1 rounded-control bg-brand-surface border-brand-border text-white placeholder:text-white/40 focus:border-brand-emerald"
          />
          <button
            type="submit"
            disabled={busy || text.trim().length < 2}
            className={`${BTN_PRIMARY} !py-1.5`}
          >
            {t('naseehChat.ask', 'Ask')}
          </button>
        </form>
        <p className="text-white/55 text-[11px] leading-relaxed">
          {t(
            'naseehChat.privacy',
            'Only your question text goes to the AI, to choose which lookup to run. Your numbers never leave our server, and this chat is not saved.'
          )}{' '}
          <AiSendsLink feature="chat" />
        </p>
      </div>
    </AiPanel>
  );
}
