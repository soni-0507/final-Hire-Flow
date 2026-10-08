import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, fieldErrors } from '../lib/api.js';
import { ErrorBanner, Field, Spinner } from '../components/ui.jsx';
import PasswordInput, { StrengthMeter } from '../components/PasswordInput.jsx';
import { AuthShell } from './Login.jsx';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setErrors({});
    if (form.password !== form.confirm) return setErrors({ confirm: 'Passwords do not match' });
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password: form.password });
      navigate('/login', { replace: true, state: { notice: 'Password updated. Log in with your new password.' } });
    } catch (err) {
      setError(
        err.status === 400 ? (
          <span>{err.message} <Link to="/forgot-password" className="font-semibold underline">Request a new link</Link></span>
        ) : err.message
      );
      setErrors(fieldErrors(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Choose a new password" subtitle="Pick something you have not used before.">
      {!token ? (
        <ErrorBanner message={<span>This reset link is incomplete. <Link to="/forgot-password" className="font-semibold underline">Request a new one</Link></span>} />
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <ErrorBanner message={error} />
          <Field label="New password" hint="At least 8 characters, with a letter and a number" error={errors.password}>
            <PasswordInput autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <StrengthMeter password={form.password} />
          </Field>
          <Field label="Confirm new password" error={errors.confirm}>
            <PasswordInput autoComplete="new-password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
          </Field>
          <button className="btn-primary w-full py-2.5" disabled={loading}>
            {loading && <Spinner className="h-4 w-4 !text-white" />} Update password
          </button>
        </form>
      )}
    </AuthShell>
  );
}
