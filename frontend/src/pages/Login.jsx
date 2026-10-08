import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth.js';
import { useTheme } from '../store/theme.js';
import { ErrorBanner, Field, Spinner, SuccessBanner } from '../components/ui.jsx';
import PasswordInput from '../components/PasswordInput.jsx';

// Demo shortcuts only appear in development (or when VITE_SHOW_DEMO=true).
const SHOW_DEMO = import.meta.env.DEV || import.meta.env.VITE_SHOW_DEMO === 'true';
const DEMOS = [
  { label: 'Recruiter demo', email: 'recruiter@demo.com' },
  { label: 'Interviewer demo', email: 'interviewer@demo.com' },
];

function Icon({ name, className = 'h-5 w-5' }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths = {
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" {...common}/><path d="m4 7 8 6 8-6" {...common}/></>,
    lock: <><rect x="5" y="10" width="14" height="10" rx="2" {...common}/><path d="M8 10V7a4 4 0 0 1 8 0v3" {...common}/></>,
    users: <><path d="M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20" {...common}/><circle cx="9.5" cy="7.5" r="3.5" {...common}/><path d="M16 11a3 3 0 0 0 0-6M21 20v-1.5a4 4 0 0 0-3-3.87" {...common}/></>,
    bolt: <path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z" {...common}/>,
    shield: <><path d="M12 3 20 6v5c0 5-3.3 8.2-8 10-4.7-1.8-8-5-8-10V6l8-3Z" {...common}/><path d="m9 12 2 2 4-4" {...common}/></>,
    chart: <><path d="M4 19V5M4 19h17" {...common}/><path d="M8 16v-4M12 16V8M16 16V5M20 16v-7" {...common}/></>,
  };
  return <svg viewBox="0 0 24 24" className={className} aria-hidden="true">{paths[name]}</svg>;
}

/** Animated split-screen authentication shell. */
export function AuthShell({ title, subtitle, children, activeTab = 'login' }) {
  const { mode, toggle } = useTheme();

  return (
    <div className="auth-page min-h-screen">
      <section className="auth-hero hidden lg:block">
        <div className="auth-hero-bg" />
        <div className="auth-hero-overlay" />
        <div className="auth-particle p1" />
        <div className="auth-particle p2" />
        <div className="auth-particle p3" />
        <div className="auth-particle p4" />
        <div className="auth-hero-content">
          <div className="hero-brand">
            <div className="hero-logo"><span>H</span></div>
            <div><strong>Hire<span>Flow</span></strong><small>Hire Smarter. Grow Faster.</small></div>
          </div>
          <div className="hero-copy">
            <p className="hero-kicker">THE MODERN HIRING COMMAND CENTER</p>
            <h2>Every candidate,<br /><b>one clear path to <span>hired.</span></b></h2>
            <p>Track applicants from first hello to signed offer, with your whole hiring team on the same page.</p>
          </div>
          <div className="hero-features">
            {[
              ['users', 'Better', 'Collaboration'],
              ['bolt', 'Faster', 'Hiring'],
              ['shield', 'Smarter', 'Decisions'],
              ['chart', 'Real-time', 'Insights'],
            ].map(([icon, a, b], i) => (
              <div className={`hero-feature feature-${i + 1}`} key={a}>
                <div className="hero-feature-icon"><Icon name={icon} /></div>
                <strong>{a}</strong><span>{b}</span>
              </div>
            ))}
          </div>
          <div className="hero-trust">
            <span>✦ Secure &amp; Trusted</span><i /> <span>⚡ Built for Modern Teams</span><i /> <span>♡ Made for hiring teams</span>
          </div>
        </div>
      </section>

      <main className="auth-main">
        <div className="auth-topbar">
          <div className="mobile-brand"><div className="hero-logo small"><span>H</span></div><strong>Hire<span>Flow</span></strong></div>
          <button onClick={toggle} className="mode-toggle" aria-label="Toggle dark mode">{mode === 'dark' ? '☀ Light mode' : '◐ Dark mode'}</button>
        </div>

        <div className="auth-form-wrap">
          <div className="auth-tabs">
            <Link className={activeTab === 'login' ? 'active' : ''} to="/login">Log in</Link>
            <Link className={activeTab === 'signup' ? 'active' : ''} to="/signup">Sign up</Link>
          </div>
          <div className="auth-card">
            <div className="auth-card-head">
              <div>
                <p className="auth-eyebrow">WELCOME TO HIREFLOW</p>
                <h1>{title}</h1>
                <p>{subtitle}</p>
              </div>
              <div className="status-dot" title="Secure sign-in"><span /></div>
            </div>
            {children}
          </div>
          <div className="auth-security"><span>🔒</span> Passwords are hashed. Email ownership is verified before login.</div>
        </div>
      </main>
    </div>
  );
}

export default function Login() {
  const login = useAuth((s) => s.login);
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: location.state?.email || '', password: '' });
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(form.email.trim(), form.password, remember);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      if (err.status === 403) {
        setError(
          <span>{err.message}{' '}
            <Link to="/verify-email" state={{ email: form.email }} className="font-semibold underline">Verify email</Link>
          </span>
        );
      } else if (err.status === 422 && err.details?.length) {
        setError(err.details[0].message);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Log in to pick up where your pipeline left off.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <SuccessBanner message={location.state?.notice} />
        <ErrorBanner message={error} />

        <Field label="Email address">
          <div className="auth-input-wrap">
            <Icon name="mail" className="h-5 w-5" />
            <input className="input auth-input" type="email" autoComplete="email" required placeholder="you@company.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
        </Field>

        <Field label="Password">
          <div className="auth-input-wrap">
            <Icon name="lock" className="h-5 w-5" />
            <PasswordInput autoComplete="current-password" placeholder="Your password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <label className="remember-row"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> <span>Remember me</span></label>
            <Link to="/forgot-password" className="auth-link">Forgot password?</Link>
          </div>
        </Field>

        <button className="btn-primary auth-submit w-full py-3" disabled={loading}>
          {loading && <Spinner className="h-4 w-4 !text-white" />} <span>{loading ? 'Checking…' : 'Log in'}</span><span className="arrow">→</span>
        </button>
      </form>

      {SHOW_DEMO && (
        <>
      <div className="auth-divider"><span>or use a demo account</span></div>
      <div className="demo-grid">
        {DEMOS.map((d) => (
          <button key={d.email} type="button" className="demo-btn" onClick={() => setForm({ email: d.email, password: 'Password123' })}>
            <span className="demo-icon"><Icon name="users" className="h-4 w-4" /></span>
            {d.label}
          </button>
        ))}
      </div>
      <p className="auth-demo-note">Demo accounts are already verified. New accounts must verify a real mailbox.</p>
        </>
      )}

      <p className="auth-bottom">New to HireFlow? <Link to="/signup">Create an account</Link></p>
    </AuthShell>
  );
}
