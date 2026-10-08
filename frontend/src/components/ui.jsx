import { useEffect, useRef } from 'react';
import { initials } from '../lib/format.js';
import { STAGE_STYLES, RECOMMENDATION_STYLES, RECOMMENDATIONS, labelOf } from '../lib/constants.js';
import { useToast } from '../store/toast.js';

export function Spinner({ className = 'h-5 w-5' }) {
  return (
    <svg className={`animate-spin text-brand-500 ${className}`} viewBox="0 0 24 24" fill="none" role="status" aria-label="Loading">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function PageLoader({ label = 'Loading...' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-20 text-sm text-stone-500">
      <Spinner /> {label}
    </div>
  );
}

export function ErrorBanner({ message, onRetry }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start justify-between gap-3 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
      <span>{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="shrink-0 font-semibold underline">
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, hint, action }) {
  return (
    <div className="px-6 py-12 text-center">
      <svg className="mx-auto mb-4 h-24 w-24" viewBox="0 0 96 96" fill="none" aria-hidden="true">
        <rect x="14" y="26" width="68" height="46" rx="8" className="fill-stone-100 dark:fill-stone-800" />
        <rect x="22" y="18" width="52" height="46" rx="8" strokeWidth="2" className="fill-white stroke-stone-200 dark:fill-stone-900 dark:stroke-stone-700" />
        <circle cx="48" cy="36" r="7" className="fill-brand-200 dark:fill-brand-700/50" />
        <rect x="32" y="48" width="32" height="5" rx="2.5" className="fill-stone-200 dark:fill-stone-700" />
        <rect x="38" y="57" width="20" height="4" rx="2" className="fill-stone-100 dark:fill-stone-800" />
      </svg>
      <p className="font-display text-lg font-semibold text-stone-800 dark:text-stone-100">{title}</p>
      {hint && <p className="muted mx-auto mt-1 max-w-sm">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {subtitle && <p className="muted mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Modal({ title, onClose, children, wide = false }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose; // always call the latest handler without re-running the effect

  useEffect(() => {
    const previous = document.activeElement;
    const focusable = () =>
      ref.current
        ? [...ref.current.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])')]
        : [];
    (ref.current?.querySelector('input,select,textarea') || ref.current)?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape') return closeRef.current();
      if (e.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) return e.preventDefault();
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previous?.focus?.(); // return focus to whatever opened the dialog
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/50 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`card max-h-[92vh] w-full overflow-y-auto rounded-b-none p-5 shadow-xl outline-none sm:rounded-b-lg ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'}`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, error, children, hint }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && !error && <p className="muted mt-1 text-xs">{hint}</p>}
      {error && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  );
}

export function StageBadge({ stage }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${STAGE_STYLES[stage]?.badge}`}>
      {stage}
    </span>
  );
}

export function RecommendationBadge({ value }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${RECOMMENDATION_STYLES[value]}`}>
      {labelOf(RECOMMENDATIONS, value)}
    </span>
  );
}

export function Stars({ value, onChange }) {
  return (
    <div className="flex gap-1" role={onChange ? 'radiogroup' : 'img'} aria-label={`Rating ${value || 0} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const Tag = onChange ? 'button' : 'span';
        return (
          <Tag
            key={n}
            type={onChange ? 'button' : undefined}
            onClick={onChange ? () => onChange(n) : undefined}
            aria-label={onChange ? `${n} star${n > 1 ? 's' : ''}` : undefined}
            className={`text-xl leading-none ${n <= value ? 'text-amber-500' : 'text-stone-300 dark:text-stone-700'} ${onChange ? 'cursor-pointer' : ''}`}
          >
            ★
          </Tag>
        );
      })}
    </div>
  );
}

export function Pagination({ meta, onPage }) {
  if (!meta || meta.pages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-stone-200 px-4 py-3 text-sm dark:border-stone-800">
      <span className="muted">
        Page {meta.page} of {meta.pages} · {meta.total} total
      </span>
      <div className="flex gap-2">
        <button className="btn-secondary btn-sm" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>Previous</button>
        <button className="btn-secondary btn-sm" disabled={meta.page >= meta.pages} onClick={() => onPage(meta.page + 1)}>Next</button>
      </div>
    </div>
  );
}

export function Toasts() {
  const { toasts, dismiss } = useToast();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={`pointer-events-auto cursor-pointer rounded-md px-4 py-2.5 text-sm font-medium text-white shadow-lg ${t.type === 'error' ? 'bg-rose-600' : 'bg-stone-900 dark:bg-stone-100 dark:text-stone-900'}`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

export function SuccessBanner({ message }) {
  if (!message) return null;
  return (
    <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">
      {message}
    </div>
  );
}

const AVATAR_COLORS = ['bg-rose-500', 'bg-orange-500', 'bg-amber-600', 'bg-emerald-600', 'bg-teal-600', 'bg-sky-600', 'bg-indigo-500', 'bg-violet-500', 'bg-fuchsia-600'];

/** Round initials badge; the colour is derived from the name so each person looks consistent everywhere. */
export function Avatar({ name = '', size = 'h-9 w-9 text-sm' }) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (
    <span aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white ${AVATAR_COLORS[h % AVATAR_COLORS.length]} ${size}`}>
      {initials(name)}
    </span>
  );
}

export const Skeleton = ({ className = '' }) => <div className={`animate-pulse rounded-md bg-stone-200 dark:bg-stone-800 ${className}`} />;

export function SkeletonList({ rows = 5 }) {
  return (
    <div className="divide-y divide-stone-100 dark:divide-stone-800" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-5 py-4">
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="hidden h-6 w-24 rounded-full sm:block" />
        </div>
      ))}
    </div>
  );
}
