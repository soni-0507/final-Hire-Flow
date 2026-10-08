import { Component } from 'react';

/** Catches render crashes so users see a friendly message instead of a blank page. */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('UI crashed:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="card max-w-md p-8 text-center">
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="muted mt-2">An unexpected error stopped this page. Your data is safe. Reloading usually fixes it.</p>
          <button className="btn-primary mt-6" onClick={() => window.location.assign('/')}>Reload the app</button>
        </div>
      </div>
    );
  }
}
