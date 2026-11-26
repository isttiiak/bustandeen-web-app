import { ReaderBottomControls } from '../components/quran/ReaderBottomControls.js';
import { ReaderAyahPane } from '../components/quran/ReaderAyahPane.js';
import { ReaderCardControls } from '../components/quran/ReaderCardControls.js';
import { ReaderChips } from '../components/quran/ReaderChips.js';
import { ReaderResumePrompt } from '../components/quran/ReaderResumePrompt.js';
import { ReaderSplitTafsir } from '../components/quran/ReaderSplitTafsir.js';
import { ReaderTafsirSection } from '../components/quran/ReaderTafsirSection.js';
import { ReaderGuestNote, ReaderTopBar } from '../components/quran/ReaderTopBar.js';
import { useQuranReader } from '../components/quran/useQuranReader.js';
import ShareAyahModal from '../components/ShareAyahModal.js';
import { useSignInGate } from '../components/SignInSheet.js';

/**
 * The ayah-by-ayah reading room (Istiak's design):
 * one big calm card — Arabic ayah + English meaning — prev/next at the bottom,
 * surah/juz/today-count chips around it, a top-right play button that recites
 * ONLY this ayah (words highlight as it plays; hover highlights without audio),
 * fullscreen for distraction-free reading. Keyboard: ← → navigate · F
 * fullscreen · Esc exit.
 *
 * Modes:
 *  - free    browse a full surah; finishing auto-advances to the NEXT surah.
 *  - khatam  serial journey; advances the khatam bookmark + wraps a khatm.
 *  - single  a "beloved surah"; finishing REDIRECTS to /quran (no next surah).
 *  - bundle  a bounded āyah selection or duʿā; does NOT count toward the goal
 *            (Istiak's spec) and redirects to /quran when finished.
 *
 * Reading counts toward the daily āyah goal in free/khatam/single only.
 * Finishing a surah (reaching its last āyah) credits ONE completion toward
 * the "top surahs" list.
 */

export default function QuranReader() {
  const gate = useSignInGate('quran');
  const reader = useQuranReader();
  const {
    mode,
    user,
    cardRef,
    fullscreen,
    current,
    shareOpen,
    setShareOpen,
    surahNo,
    surahMeta,
    editions,
    showTranslit,
  } = reader;

  return (
    <div className="min-h-screen bg-brand-void pb-16">
      <div className="max-w-3xl mx-auto px-4 pt-4 space-y-4">
        <ReaderTopBar mode={mode} />

        <ReaderGuestNote user={user} />

        {/* info chips */}
        <ReaderChips reader={reader} />

        {/* ── THE CARD ──
            Fullscreen uses the `fullscreen` STATE (CSS fixed-inset) so it works
            on iOS too; native Fullscreen API is a progressive bonus. On mobile
            the split becomes a vertical stack — āyah first, tafsir below. */}
        <div
          ref={cardRef}
          className={`relative rounded-card border border-brand-border shadow-elev-2 bg-gradient-to-br from-reader-from via-reader-via to-reader-to ${fullscreen ? 'fixed inset-0 z-[9999] rounded-none flex flex-col md:flex-row overflow-y-auto overflow-x-hidden md:overflow-hidden' : 'overflow-hidden p-4 sm:p-10'}`}
        >
          <ReaderCardControls reader={reader} gate={gate} />

          <ReaderAyahPane reader={reader} />
          {/* end left pane */}

          <ReaderSplitTafsir reader={reader} />
        </div>

        {/* bottom controls: jump (left) · volume (right) */}
        <ReaderBottomControls reader={reader} />

        {/* ── Tafsir (authentic, sourced — the Quran rooms carry NO AI) ── */}
        <ReaderTafsirSection reader={reader} />
      </div>

      {/* ── Continue where you left off? ── */}
      <ReaderResumePrompt reader={reader} />

      {current && (
        <ShareAyahModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          surahNo={surahNo}
          surahMeta={surahMeta}
          ayahNumberInSurah={current.numberInSurah}
          initialEditions={editions}
          initialTranslit={showTranslit}
        />
      )}
      {gate.sheet}
    </div>
  );
}
