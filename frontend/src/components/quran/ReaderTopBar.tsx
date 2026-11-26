import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { ReaderMode } from './useReaderText.js';

/** Back, the mode badges and the keyboard hint. */
export function ReaderTopBar({ mode }: { mode: ReaderMode }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <div className="flex items-center justify-between text-xs">
      <button
        className="text-white/60 hover:text-white"
        onClick={() => {
          // Go back to wherever the reader was opened from; fall back to
          // the section home when the reader was the entry point.
          if (window.history.length > 1) navigate(-1);
          else navigate(mode === 'khatam' ? '/quran/khatam' : '/quran');
        }}
      >
        {t('quranReader.back', '← Back')}
      </button>
      <div className="flex items-center gap-2 text-white/60">
        {mode === 'khatam' && (
          <span className="px-2 py-0.5 rounded-full bg-brand-emerald/15 text-brand-emerald border border-brand-emerald/30 font-bold">
            {t('quranReader.khatamJourney', 'Khatam journey')}
          </span>
        )}
        {(mode === 'bundle' || mode === 'single') && (
          <span className="px-2 py-0.5 rounded-full bg-brand-gold/15 text-brand-gold border border-brand-gold/30 font-bold">
            {t('quranReader.specialSelection', 'Special selection')}
          </span>
        )}
        <span className="hidden sm:inline">
          {t('quranReader.keyboardHint', 'Keys: ← → · F fullscreen')}
        </span>
      </div>
    </div>
  );
}

/** A guest reads freely (U9); nothing is saved without an account. */
export function ReaderGuestNote({ user }: { user: unknown }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <>
      {!user && (
        <p className="text-xs text-white/70 leading-relaxed">
          {t(
            'quranReader.guestNote',
            'You are reading as a guest. Sign in to save your place, bookmarks and daily goal.'
          )}{' '}
          <button
            type="button"
            className="hit-44 font-semibold text-brand-emerald underline underline-offset-2"
            onClick={() => {
              sessionStorage.setItem(
                'bustandeen_redirect',
                window.location.pathname + window.location.search
              );
              navigate('/login');
            }}
          >
            {t('app.signIn', 'Sign In')}
          </button>
        </p>
      )}
    </>
  );
}
