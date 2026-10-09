import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth.js';
import { fieldErrors } from '../lib/api.js';
import { ErrorBanner, Field, Spinner } from '../components/ui.jsx';
import PasswordInput, { StrengthMeter } from '../components/PasswordInput.jsx';
import { AuthShell } from './Login.jsx';

const ROLE_OPTIONS = [
  { value: 'recruiter', title: 'Recruiter', text: 'Manage candidates, stages and interviews.' },
  { value: 'interviewer', title: 'Interviewer', text: 'Review assigned candidates and feedback.' },
];

export default function Signup() {
  const signup = useAuth((s) => s.signup);
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', email: location.state?.email || '', password: '', confirm: '', role: 'recruiter', inviteCode: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setErrors({});
    if (form.password !== form.confirm) return setErrors({ confirm: 'Passwords do not match' });
    setLoading(true);
    try {
      const result = await signup({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        inviteCode: form.role === 'recruiter' ? form.inviteCode : undefined,
      });
      navigate('/verify-email', { replace: true, state: { email: result.email || form.email, notice: 'Verification email sent. Check your inbox for the 6-digit code.' } });
    } catch (err) {
      setError(err.message);
      setErrors(fieldErrors(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="Join your hiring team. We verify every mailbox before login." activeTab="signup">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <ErrorBanner message={error} />

        <Field label="Full name" error={errors.name}>
          <input className="input" required value={form.name} onChange={set('name')} autoComplete="name" placeholder="Your full name" />
        </Field>

        <Field label="Work email" hint="You must be able to receive our verification code." error={errors.email}>
          <input className="input" type="email" autoComplete="email" required value={form.email} onChange={set('email')} placeholder="you@company.com" />
        </Field>

        <div>
          <label className="label">Account type</label>
          <div className="grid gap-2 sm:grid-cols-2">
            {ROLE_OPTIONS.map((r) => (
              <label key={r.value} className={`role-card ${form.role === r.value ? 'selected' : ''}`}>
                <input type="radio" name="role" className="sr-only" checked={form.role === r.value} onChange={() => setForm({ ...form, role: r.value })} />
                <span className="role-card-title">{r.title}</span>
                <span className="role-card-text">{r.text}</span>
              </label>
            ))}
          </div>
          {errors.role && <p className="mt-1 text-xs text-rose-600">{errors.role}</p>}
        </div>

        {form.role === 'recruiter' && (
          <Field label="Recruiter invite code" hint="Ask your hiring admin for the company code." error={errors.inviteCode}>
            <input className="input" required value={form.inviteCode} onChange={set('inviteCode')} autoComplete="off" placeholder="Company invite code" />
          </Field>
        )}

        <Field label="Password" hint="At least 8 characters, including a letter and a number." error={errors.password}>
          <PasswordInput autoComplete="new-password" placeholder="Create a password" value={form.password} onChange={set('password')} />
          <StrengthMeter password={form.password} />
        </Field>

        <Field label="Confirm password" error={errors.confirm}>
          <PasswordInput autoComplete="new-password" placeholder="Repeat your password" value={form.confirm} onChange={set('confirm')} />
        </Field>

        <button className="auth-submit" disabled={loading}>
          {loading && <Spinner className="h-4 w-4 !text-white" />} Create account
        </button>
      </form>

    </AuthShell>
  );
}
