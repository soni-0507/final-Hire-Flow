import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { ErrorBanner, Field, Spinner, SuccessBanner } from '../components/ui.jsx';
import { AuthShell } from './Login.jsx';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      setSent(await api.post('/auth/forgot-password', { email }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // private demo mode: the API can optionally expose the link in addition to sending the real email
  const demoLink = sent?.devResetLink ? (() => { const u = new URL(sent.devResetLink); return u.pathname + u.search; })() : null;

  return (
    <AuthShell title="Reset your password" subtitle="Enter your account email and we will send you a reset link.">
      {sent ? (
        <div className="space-y-4">
          <SuccessBanner message={sent.message} />
          {demoLink && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              <p className="font-semibold">Demo mode</p>
              <p className="mt-0.5">A real reset email was sent. This private demo also exposes the link here:</p>
              <Link to={demoLink} className="mt-2 inline-block font-semibold underline">Choose a new password</Link>
            </div>
          )}
          <Link to="/login" className="btn-secondary w-full">Back to log in</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <ErrorBanner message={error} />
          <Field label="Email">
            <input className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <button className="btn-primary w-full py-2.5" disabled={loading}>
            {loading && <Spinner className="h-4 w-4 !text-white" />} Send reset link
          </button>
          <p className="muted text-center">
            Remembered it? <Link to="/login" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">Log in</Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
