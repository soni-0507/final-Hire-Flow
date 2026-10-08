import { useState } from 'react';
import { api } from '../lib/api.js';
import { useFetch } from '../lib/useFetch.js';
import { ErrorBanner, PageLoader } from './ui.jsx';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Month calendar of interviews. `renderRow(interview)` draws the detail rows for the selected day. */
export default function CalendarView({ version, renderRow }) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selected, setSelected] = useState(() => new Date().toDateString());

  const gridStart = new Date(month);
  gridStart.setDate(1 - month.getDay());
  const days = Array.from({ length: 42 }, (_, k) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + k);
    return d;
  });
  const gridEnd = new Date(days[41].getTime() + 86400000);

  const { data, loading, error, reload } = useFetch(
    () => api.get('/interviews', { from: gridStart.toISOString(), to: gridEnd.toISOString(), limit: 200 }),
    [month.getTime(), version]
  );

  const byDay = {};
  (data?.data || []).forEach((i) => {
    const key = new Date(i.scheduledAt).toDateString();
    (byDay[key] ||= []).push(i);
  });
  const shift = (n) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  const today = new Date().toDateString();
  const dayList = (byDay[selected] || []).sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
        <div className="flex gap-2">
          <button className="btn-secondary btn-sm" onClick={() => shift(-1)} aria-label="Previous month">Prev</button>
          <button className="btn-secondary btn-sm" onClick={() => { const n = new Date(); setMonth(new Date(n.getFullYear(), n.getMonth(), 1)); setSelected(n.toDateString()); }}>Today</button>
          <button className="btn-secondary btn-sm" onClick={() => shift(1)} aria-label="Next month">Next</button>
        </div>
      </div>
      <ErrorBanner message={error} onRetry={reload} />

      <div className={`card overflow-hidden ${loading ? 'opacity-60' : ''}`}>
        <div className="grid grid-cols-7 border-b border-stone-200 dark:border-stone-800">
          {WEEKDAYS.map((w) => <div key={w} className="th text-center">{w}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d) => {
            const key = d.toDateString();
            const items = byDay[key] || [];
            const inMonth = d.getMonth() === month.getMonth();
            return (
              <button
                key={key}
                onClick={() => setSelected(key)}
                className={`min-h-[4.5rem] border-b border-r border-stone-100 p-1.5 text-left align-top transition-colors hover:bg-stone-50 dark:border-stone-800 dark:hover:bg-stone-800/40 sm:min-h-[5.5rem] ${selected === key ? 'bg-brand-50 dark:bg-brand-700/20' : ''} ${inMonth ? '' : 'opacity-40'}`}
                aria-label={`${d.toDateString()}, ${items.length} interviews`}
              >
                <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${key === today ? 'bg-brand-600 text-white' : ''}`}>{d.getDate()}</span>
                <span className="mt-1 hidden space-y-0.5 sm:block">
                  {items.slice(0, 2).map((i) => (
                    <span key={i._id} className={`block truncate rounded bg-brand-100 px-1 text-[11px] font-medium text-brand-700 dark:bg-brand-700/30 dark:text-brand-200 ${i.status === 'cancelled' ? 'line-through opacity-60' : ''}`}>
                      {i.candidate.name}
                    </span>
                  ))}
                  {items.length > 2 && <span className="muted block text-[11px]">+{items.length - 2} more</span>}
                </span>
                {items.length > 0 && <span className="mt-1 block text-[11px] font-semibold text-brand-600 sm:hidden">{items.length}</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="card">
        <h3 className="px-5 pt-4 text-base font-bold">{new Date(selected).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
        {loading && !data ? <PageLoader /> : dayList.length === 0 ? (
          <p className="muted px-5 py-6">No interviews on this day.</p>
        ) : (
          <ul className="mt-1 divide-y divide-stone-100 dark:divide-stone-800">{dayList.map(renderRow)}</ul>
        )}
      </div>
    </div>
  );
}
