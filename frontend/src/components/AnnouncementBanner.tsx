import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useActiveAnnouncement } from '../hooks/useAnnouncement.js';

const STATE_KEY = 'bustandeen_announcement_state';
/** Crossing the banner this many times hides it for HIDE_MS, then it returns. */
const MAX_DISMISSALS = 3;
const HIDE_MS = 24 * 60 * 60 * 1000;

interface BannerState {
  id: string;
  /** Times the banner was crossed since it last (re)appeared for a full cycle. */
  count: number;
  /** Epoch ms until which it stays hidden after the third crossing. */
  hiddenUntil: number;
  /** "Close permanently" was chosen for this announcement. */
  permanent: boolean;
}

/** Per-viewer convenience only, never shared state and never read by the
 * server. Same pattern as other per-viewer localStorage use in this app. */
function readState(id: string): BannerState {
  const fresh: BannerState = { id, count: 0, hiddenUntil: 0, permanent: false };
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return fresh;
    const parsed = JSON.parse(raw) as Partial<BannerState>;
    // A different announcement starts from scratch.
    if (parsed.id !== id) return fresh;
    return {
      id,
      count: Number(parsed.count) || 0,
      hiddenUntil: Number(parsed.hiddenUntil) || 0,
      permanent: parsed.permanent === true,
    };
  } catch {
    return fresh;
  }
}

function writeState(state: BannerState): void {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    // ignore: private mode / blocked storage, it just won't persist
  }
}

/**
 * The public broadcast. Crossing it hides it only until the next reload; after
 * the third crossing it rests for 24 hours and then comes back, so an
 * announcement can't be lost by a single accidental tap. "Close permanently"
 * (inside the details dialog) is the only way to remove it for good.
 */
export default function AnnouncementBanner() {
  const { t } = useTranslation();
  const { data: announcement } = useActiveAnnouncement();
  // Crossed during this page load: hidden until the next reload.
  const [crossed, setCrossed] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  if (!announcement || crossed) return null;

  const state = readState(announcement.id);
  if (state.permanent) return null;
  if (state.hiddenUntil > Date.now()) return null;

  const cross = () => {
    const wasResting = state.hiddenUntil > 0; // the 24h rest just ended
    const count = (wasResting ? 0 : state.count) + 1;
    writeState(
      count >= MAX_DISMISSALS
        ? { ...state, count: 0, hiddenUntil: Date.now() + HIDE_MS }
        : { ...state, count, hiddenUntil: 0 }
    );
    setCrossed(true);
  };

  const closeForever = () => {
    writeState({ ...state, permanent: true });
    setDetailsOpen(false);
    setCrossed(true);
  };

  return (
    <>
      <div className="sticky top-0 z-[45] px-4 py-2.5 bg-brand-emerald/15 border-b border-brand-emerald/20 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-white/90 font-semibold text-sm leading-snug">{announcement.title}</p>
            {/* A couple of lines that fade out; the full text is in the dialog */}
            <p
              className="text-white/55 text-xs leading-relaxed mt-0.5 max-h-8 overflow-hidden"
              style={{
                WebkitMaskImage: 'linear-gradient(to bottom, #000 40%, transparent)',
                maskImage: 'linear-gradient(to bottom, #000 40%, transparent)',
              }}
            >
              {announcement.body}
            </p>
            <button
              onClick={() => setDetailsOpen(true)}
              className="mt-1 text-[11px] font-bold text-brand-emerald underline underline-offset-2"
            >
              {t('common.seeDetails', 'See details')}
            </button>
          </div>
          <button
            onClick={cross}
            className="shrink-0 p-1 rounded-full hover:bg-white/10 transition-colors"
            aria-label={t('common.dismiss', 'Dismiss')}
          >
            <XMarkIcon className="w-4 h-4 text-white/60" />
          </button>
        </div>
      </div>

      {detailsOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm grid place-items-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setDetailsOpen(false);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={announcement.title}
              className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-3xl bg-brand-deep border border-brand-emerald/25 p-6 space-y-4"
            >
              <h2 className="text-white font-black text-lg leading-snug">{announcement.title}</h2>
              <p className="text-white/70 text-sm leading-relaxed whitespace-pre-line">
                {announcement.body}
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setDetailsOpen(false)}
                  className="flex-1 btn btn-sm rounded-xl bg-white/5 border-white/20 text-white/70"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  onClick={closeForever}
                  className="flex-1 btn btn-sm rounded-xl bg-brand-emerald/20 border-brand-emerald/40 text-brand-emerald"
                >
                  {t('common.closePermanently', 'Close permanently')}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
