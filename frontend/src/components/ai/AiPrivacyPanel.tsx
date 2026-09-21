import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../lib/api.js';
import { useAuthStore } from '../../store/useAuthStore.js';
import { useGroqKeyStatus } from '../../hooks/useAi.js';

interface Row {
  key: string;
  title: string;
  sends: string;
}

/** What each Naseeh feature sends to the AI, in plain words, plus a one-tap
 * off switch. Keep this list in step with what the components actually send. */
export default function AiPrivacyPanel() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const setAiEnabled = useAuthStore((s) => s.setAiEnabled);
  const { data: keyStatus } = useGroqKeyStatus();
  const [confirming, setConfirming] = useState(false);
  const [failed, setFailed] = useState(false);

  const rows: Row[] = [
    {
      key: 'quickLog',
      title: t('naseehPrivacy.quickLog', 'Quick log'),
      sends: t(
        'naseehPrivacy.quickLogSends',
        'The sentence you type, and the names of your dhikr types. Please keep cycle or health details out of it.'
      ),
    },
    {
      key: 'summary',
      title: t('naseehPrivacy.summary', 'Weekly summary and muhāsabah'),
      sends: t(
        'naseehPrivacy.summarySends',
        'Counts only: dhikr total, streak lengths, prayer percentage, Quran ayat today, fasts this month.'
      ),
    },
    {
      key: 'patterns',
      title: t('naseehPrivacy.patterns', 'What I noticed'),
      sends: t(
        'naseehPrivacy.patternsSends',
        'Two short sentences we already worked out (a time of day, a weekday, a prayer name, a percentage). No raw logs.'
      ),
    },
    {
      key: 'kaza',
      title: t('naseehPrivacy.kaza', 'Make-up prayer plan'),
      sends: t('naseehPrivacy.kazaSends', 'One sentence with your owed count and a date.'),
    },
    {
      key: 'chat',
      title: t('naseehPrivacy.chat', 'Ask about my data'),
      sends: t(
        'naseehPrivacy.chatSends',
        'Only the question you type. The answer is worked out on our server from your logs.'
      ),
    },
    {
      key: 'coaching',
      title: t('naseehPrivacy.coaching', 'Streak coaching, fasting and welcome-back notes'),
      sends: t(
        'naseehPrivacy.coachingSends',
        'A streak length, the kind of fast and its day number, or how many days you were away.'
      ),
    },
    {
      key: 'cycle',
      title: t('naseehPrivacy.cycle', 'Cycle tracker (Rayhanah)'),
      sends: t(
        'naseehPrivacy.cycleSends',
        'Nothing. Cycle data is never sent to an AI. While you are on a rest day, Naseeh makes no progress-card AI requests at all.'
      ),
    },
  ];

  const turnOff = async () => {
    setFailed(false);
    setAiEnabled(false);
    if (user) {
      try {
        await api.patch('/api/user/me', { aiEnabled: false });
      } catch {
        // The switch is already off on this device; say the account copy may lag.
        setFailed(true);
      }
    }
  };

  return (
    <details className="rounded-2xl border border-brand-border bg-brand-deep/60 group">
      <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-white font-bold text-sm">
          <span aria-hidden>🔒</span>
          {t('naseehPrivacy.title', 'AI usage and privacy')}
        </span>
        <span
          className="text-white/40 text-xs group-open:rotate-180 transition-transform"
          aria-hidden
        >
          ▾
        </span>
      </summary>

      <div className="px-4 pb-4 space-y-4">
        <p className="text-white/60 text-sm leading-relaxed">
          {t(
            'naseehPrivacy.intro',
            'Naseeh only sees what is listed below. It never gets your journal notes, your name or your account details, and no cycle data of any kind is ever sent.'
          )}
        </p>

        <ul className="space-y-2.5">
          {rows.map((r) => (
            <li key={r.key} className="text-sm">
              <p className="text-white/85 font-semibold">{r.title}</p>
              <p className="text-white/50 text-xs leading-relaxed">{r.sends}</p>
            </li>
          ))}
        </ul>

        <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3 space-y-1.5 text-xs text-white/60 leading-relaxed">
          <p>
            {keyStatus?.hasOwnKey
              ? t(
                  'naseehPrivacy.ownKey',
                  'You are using your own Groq key, so your requests do not touch the shared Naseeh allowance.'
                )
              : t(
                  'naseehPrivacy.sharedKey',
                  'You are using the shared Naseeh key. You can add your own Groq key in Settings.'
                )}
          </p>
          <p>
            {t(
              'naseehPrivacy.limits',
              'Limits: up to 20 AI requests and 30 typed questions a day. Most cards are re-worded once a week and remembered on this device.'
            )}
          </p>
          <p>
            {t(
              'naseehPrivacy.logs',
              'We keep a record that a request happened (which feature, and whether it worked), never its content.'
            )}
          </p>
        </div>

        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="btn btn-sm btn-outline border-white/20 text-white/70 hover:bg-white/10"
          >
            {t('naseehPrivacy.turnOff', 'Turn off Naseeh')}
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-white/70 text-sm">
              {t(
                'naseehPrivacy.confirm',
                'Turn Naseeh off? You can switch it back on any time in Settings.'
              )}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void turnOff()}
                className="btn btn-sm bg-brand-gold/20 border-brand-gold/30 text-brand-gold hover:bg-brand-gold/30"
              >
                {t('naseehPrivacy.confirmYes', 'Yes, turn off')}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="btn btn-sm btn-ghost text-white/60"
              >
                {t('naseehPrivacy.confirmNo', 'Keep it on')}
              </button>
            </div>
          </div>
        )}
        {failed && (
          <p role="alert" className="text-brand-gold text-xs">
            {t(
              'naseehPrivacy.failed',
              'Naseeh is off on this device, but we could not update your account. Open Settings to confirm.'
            )}
          </p>
        )}
      </div>
    </details>
  );
}
