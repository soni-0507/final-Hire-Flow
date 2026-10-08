import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { StageBadge, Spinner } from './ui.jsx';

/** Ctrl/Cmd + K quick search: jump to any candidate. */
export default function CommandPalette({ onClose }) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(0);

  useEffect(() => inputRef.current?.focus(), []);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await api.get('/candidates', { q, limit: 6, sort: 'name' });
        if (!cancelled) { setResults(r.data); setActive(0); }
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, q ? 250 : 0);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q]);

  const go = (c) => { navigate(`/candidates/${c._id}`); onClose(); };

  function onKeyDown(e) {
    if (e.key === 'Escape') onClose();
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && results[active]) go(results[active]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-stone-950/50 p-4 pt-[12vh]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Search candidates" className="card w-full max-w-xl overflow-hidden shadow-xl" onKeyDown={onKeyDown}>
        <div className="flex items-center gap-3 border-b border-stone-200 px-4 dark:border-stone-800">
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search candidates by name, email, position or skill"
            className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-stone-400"
            aria-label="Search candidates"
          />
          {loading && <Spinner className="h-4 w-4" />}
          <kbd className="muted rounded border border-stone-300 px-1.5 text-xs dark:border-stone-700">Esc</kbd>
        </div>
        <ul className="max-h-80 overflow-y-auto py-1">
          {!loading && results.length === 0 && <li className="muted px-4 py-6 text-center">No candidates found</li>}
          {results.map((c, i) => (
            <li key={c._id}>
              <button
                onClick={() => go(c)}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left ${i === active ? 'bg-brand-50 dark:bg-brand-700/20' : ''}`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{c.name}</span>
                  <span className="muted block truncate text-xs">{c.position} · {c.email}</span>
                </span>
                <StageBadge stage={c.stage} />
              </button>
            </li>
          ))}
        </ul>
        <p className="muted border-t border-stone-200 px-4 py-2 text-xs dark:border-stone-800">Use the arrow keys to move, Enter to open.</p>
      </div>
    </div>
  );
}
