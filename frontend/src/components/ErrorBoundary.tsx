import { Component, type ErrorInfo, type ReactNode } from 'react';

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
 * recoverable screen instead — it does not fix the underlying bug, but it
 * stops one bad component from taking down the entire app.
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

    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-brand-void">
        <div className="text-center space-y-5 max-w-sm w-full">
          <div className="text-6xl">🌙</div>
          <h2 className="text-2xl font-black text-white">Something went wrong</h2>
          <p className="text-white/50 text-sm leading-relaxed">
            An unexpected error interrupted the app. Your worship data is safe — try reloading.
          </p>
          <div className="flex flex-col gap-3">
            <button
              className="btn bg-brand-emerald-dim hover:bg-brand-emerald-dim hover:brightness-90 text-white border-0 w-full"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
            <button
              className="btn btn-ghost text-brand-emerald border border-brand-emerald/30 w-full"
              onClick={() => {
                window.location.href = '/';
              }}
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }
}
