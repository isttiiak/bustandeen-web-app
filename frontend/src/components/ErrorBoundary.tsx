import { Component, useState, type ErrorInfo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { LeafIcon } from './icons/IslamicIcons.js';
import { BTN_PRIMARY, BTN_SECONDARY } from './bustanStyles.js';
import {
  isChunkLoadError,
  isRecoveringFromStaleChunk,
  recoverFromStaleChunk,
} from '../utils/staleChunkReload.js';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Last-resort safety net. Without this, any render-time throw (a bad API
 * shape, an unexpected undefined right after the day rolls over, etc.)
 * unmounts the whole React tree and leaves a blank white page with no way
 * back except the user guessing to hard-refresh. This turns that into a
 * recoverable screen instead. It does not fix the underlying bug, but it
 * stops one bad component from taking down the entire app.
 *
 * A missing lazy chunk after a deploy is not a bug: it gets "A new version
 * is ready" and an Update button that fetches the new service worker first
 * (a plain reload is often answered by the old worker's old shell again).
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled render error:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return <ErrorScreen error={error} />;
  }
}

function ErrorScreen({ error }: { error: Error }) {
  const { t } = useTranslation();
  // The automatic path (staleChunkReload) is already updating and will
  // reload by itself; the cancelled import surfaces here meanwhile.
  const autoUpdating = isRecoveringFromStaleChunk();
  const staleBuild = autoUpdating || isChunkLoadError(error);
  const [updating, setUpdating] = useState(autoUpdating);

  const update = () => {
    setUpdating(true);
    void recoverFromStaleChunk();
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-brand-void">
      <div className="text-center space-y-5 max-w-sm w-full">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-brand-border bg-brand-deep text-brand-emerald shadow-elev-1">
          {staleBuild ? (
            <ArrowPathIcon
              className={`h-7 w-7 ${updating ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
          ) : (
            <LeafIcon className="h-7 w-7" aria-hidden="true" />
          )}
        </span>
        <h2 className="font-display text-2xl font-bold text-white">
          {staleBuild
            ? t('errorBoundary.newVersionTitle', 'A new version is ready')
            : t('errorBoundary.title', 'Something went wrong')}
        </h2>
        <p className="text-white/70 text-sm leading-relaxed">
          {staleBuild
            ? t(
                'errorBoundary.newVersionBody',
                'Bustandeen was updated while this page was open. Your worship data is safe. Tap Update to load the new version.'
              )
            : t(
                'errorBoundary.body',
                'An unexpected error interrupted the app. Your worship data is safe. Try reloading.'
              )}
        </p>
        <div className="flex flex-col gap-3">
          {staleBuild ? (
            <button className={`${BTN_PRIMARY} w-full`} onClick={update} disabled={updating}>
              {updating
                ? t('errorBoundary.updating', 'Updating...')
                : t('errorBoundary.update', 'Update')}
            </button>
          ) : (
            <button className={`${BTN_PRIMARY} w-full`} onClick={() => window.location.reload()}>
              {t('errorBoundary.reload', 'Reload')}
            </button>
          )}
          <button
            className={`${BTN_SECONDARY} w-full`}
            onClick={() => {
              window.location.href = '/';
            }}
          >
            {t('errorBoundary.home', 'Go to Home')}
          </button>
        </div>
      </div>
    </div>
  );
}
