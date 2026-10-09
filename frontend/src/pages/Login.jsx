import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth.js';
import { useTheme } from '../store/theme.js';
import { ErrorBanner, Field, Spinner, SuccessBanner } from '../components/ui.jsx';
import PasswordInput from '../components/PasswordInput.jsx';

// Demo shortcuts only appear in development (or when VITE_SHOW_DEMO=true).
const SHOW_DEMO = import.meta.env.DEV || import.meta.env.VITE_SHOW_DEMO === 'true';
const DEMOS = [
  { label: 'Try as recruiter', email: 'recruiter@demo.com' },
  { label: 'Try as interviewer', email: 'interviewer@demo.com' },
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

function Brand() {
  return (
    <div className="hfa-brand">
      <div className="hero-logo"><span>H</span></div>
      <div>
        <strong>Hire<span>Flow</span></strong>
        <small>Hire Smarter. Grow Faster.</small>
      </div>
    </div>
  );
}

/** Split-screen authentication shell (photo panel + form). Styles live in auth-hireflow.css. */
export function AuthShell({ title, subtitle, children, activeTab = 'login' }) {
  const { mode, toggle } = useTheme();

  return (
    <div className="hfa">
      <section className="hfa-hero">
        <div className="hfa-hero-bg" />
        <div className="hfa-hero-shade" />
        <div className="hfa-hero-inner">
          <Brand />
          <div className="hfa-copy">
            <h2><span>Every candidate,</span><b>one clear path to <em>hired.</em></b></h2>
            <p>Track applicants from first hello to signed offer, with your whole hiring team on the same page.</p>
          </div>
          <ul className="hfa-features">
            {[
              ['users', 'Better', 'Collaboration'],
              ['bolt', 'Faster', 'Hiring'],
              ['shield', 'Smarter', 'Decisions'],
              ['chart', 'Real-time', 'Insights'],
            ].map(([icon, a, b]) => (
              <li className="hfa-feature" key={a}>
                <i><Icon name={icon} /></i>
                <span>{a}</span><span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <main className="hfa-main">
        <div className="hfa-topbar">
          <div className="hfa-mobile-brand"><Brand /></div>
          <button type="button" onClick={toggle} className="hfa-mode" aria-label="Toggle dark mode">{mode === 'dark' ? 'Light mode' : 'Dark mode'}</button>
        </div>

        <div className="hfa-wrap">
          <div className="hfa-tabs">
            <Link className={activeTab === 'login' ? 'active' : ''} to="/login">Log in</Link>
            <Link className={activeTab === 'signup' ? 'active' : ''} to="/signup">Sign up</Link>
          </div>
          <div className="hfa-head">
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <div className="hfa-card">{children}</div>
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

        <Field label="Email">
          <div className="auth-input-wrap">
            <Icon name="mail" className="h-5 w-5" />
            <input className="input" type="email" autoComplete="email" required placeholder="you@company.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
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

        <button className="auth-submit" disabled={loading}>
          {loading && <Spinner className="h-4 w-4 !text-white" />} <span>{loading ? 'Checking…' : 'Log in'}</span>
        </button>
      </form>

      {SHOW_DEMO && (
        <div className="hfa-demo">
          <p>Seeded demo logins (password: Password123), after running the seed command</p>
          <div className="demo-grid">
            {DEMOS.map((d) => (
              <button key={d.email} type="button" className="demo-btn" onClick={() => setForm({ email: d.email, password: 'Password123' })}>
                {d.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </AuthShell>
  );
}
