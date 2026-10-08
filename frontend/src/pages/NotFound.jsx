import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6 text-center">
      <div>
        <p className="font-display text-8xl font-bold text-brand-500">404</p>
        <h1 className="mt-2 text-2xl font-bold">This page does not exist</h1>
        <p className="muted mx-auto mt-2 max-w-sm">The link may be old or mistyped. Head back and pick up where you left off.</p>
        <Link to="/" className="btn-primary mt-6">Back to the app</Link>
      </div>
    </div>
  );
}
