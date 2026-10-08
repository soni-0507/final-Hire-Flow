import { useState } from 'react';

export default function PasswordInput({ value, onChange, autoComplete, placeholder, id }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        className="input pr-16"
        type={show ? 'text' : 'password'}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required
        value={value}
        onChange={onChange}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute inset-y-0 right-0 px-3 text-xs font-semibold text-stone-500 hover:text-brand-600"
      >
        {show ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}

export function passwordScore(pw) {
  let s = 0;
  if (pw.length >= 8) s += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s += 1;
  if (/\d/.test(pw)) s += 1;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 12) s += 1;
  return s;
}

const LABELS = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];
const COLORS = ['bg-stone-300', 'bg-rose-500', 'bg-amber-500', 'bg-teal-500', 'bg-emerald-500'];

export function StrengthMeter({ password }) {
  if (!password) return null;
  const s = passwordScore(password);
  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i < s ? COLORS[s] : 'bg-stone-200 dark:bg-stone-800'}`} />
        ))}
      </div>
      <p className="muted mt-1 text-xs">Password strength: {LABELS[s]}</p>
    </div>
  );
}
