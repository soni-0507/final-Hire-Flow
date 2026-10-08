import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth.js';
import { ErrorBanner, Field, Spinner, SuccessBanner } from '../components/ui.jsx';
import { AuthShell } from './Login.jsx';

export default function VerifyEmail() {
  const verifyEmail = useAuth((s) => s.verifyEmail);
  const resendVerification = useAuth((s) => s.resendVerification);
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState(location.state?.email || '');
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(location.state?.notice || 'We sent a 6-digit code to your email.');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!cooldown) return undefined;
    const t = setInterval(() => setCooldown((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setNotice('');
    setLoading(true);
    try {
      await verifyEmail(email, code);
      navigate('/login', { replace: true, state: { email, notice: 'Email verified. You can log in now.' } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    if (!email || cooldown) return;
    setError(null);
    setResending(true);
    try {
      const result = await resendVerification(email);
      setNotice(result.message);
      setCooldown(30);
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthShell title="Verify your email" subtitle="One quick step to keep HireFlow accounts genuine and secure." activeTab="login">
      <div className="space-y-5">
        <SuccessBanner message={notice} />
        <ErrorBanner message={error} />
        <div className="verify-icon mx-auto">✉</div>
        <div className="text-center">
          <p className="text-sm text-stone-600 dark:text-stone-300">Enter the 6-digit code sent to</p>
          <p className="mt-1 font-semibold text-stone-900 dark:text-white">{email || 'your email address'}</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <Field label="Email address">
            <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </Field>
          <Field label="Verification code" hint="The code expires in 15 minutes.">
            <input
              className="input verification-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              pattern="\d{6}"
              placeholder="000000"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
          </Field>
          <button className="btn-primary w-full py-3" disabled={loading || code.length !== 6}>
            {loading && <Spinner className="h-4 w-4 !text-white" />} Verify email
          </button>
        </form>

        <div className="text-center">
          <button type="button" onClick={resend} disabled={resending || cooldown > 0} className="text-sm font-semibold text-brand-600 hover:underline disabled:opacity-50 dark:text-brand-400">
            {resending ? 'Sending…' : cooldown ? `Resend code in ${cooldown}s` : 'Resend verification code'}
          </button>
        </div>

        <p className="muted text-center">
          Wrong email? <Link to="/signup" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">Go back to sign up</Link>
        </p>
      </div>
    </AuthShell>
  );
}
