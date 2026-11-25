import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { ErrorScreen } from './ErrorBoundary.js';
import { reportClientError } from '../utils/errorReporting.js';

interface Props {
  children: ReactNode;
  /**
   * Changes on every navigation (and when a sign-in sync remounts the routes):
   * the path, the router's per-navigation key, and the routes revision. A new
   * value clears a caught error, so leaving a broken page, or clicking its own
   * link again, shows the next page instead of the failure.
   */
  resetKey: string;
}

interface State {
  error: Error | null;
  resetKey: string;
}

/**
 * One page crashing must not blank the whole app (audit 2026-11-16 P4-2).
 * It wraps the route table, inside <main> and below the navbar, so the
 * navigation, banners and floating buttons keep working while the page
 * shows a short message with a way back. The app-wide ErrorBoundary
 * (main.tsx) stays as the last resort for anything outside the routes.
 */
export default class RouteErrorBoundary extends Component<Props, State> {
  state: State = { error: null, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    return props.resetKey === state.resetKey ? null : { error: null, resetKey: props.resetKey };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled route render error:', error, info.componentStack);
    reportClientError(error, 'render');
  }

  private retry = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return <RouteErrorScreen error={error} onRetry={this.retry} />;
  }
}

function RouteErrorScreen({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const navigate = useNavigate();
  return <ErrorScreen error={error} inline onRetry={onRetry} onHome={() => navigate('/')} />;
}
