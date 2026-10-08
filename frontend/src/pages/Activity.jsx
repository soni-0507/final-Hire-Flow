import { useState } from 'react';
import { api } from '../lib/api.js';
import { useFetch } from '../lib/useFetch.js';
import { timeAgo } from '../lib/format.js';
import { EmptyState, ErrorBanner, PageHeader, PageLoader, Pagination } from '../components/ui.jsx';

const TABS = [
  { value: 'log', label: 'Activity log' },
  { value: 'emails', label: 'Email outbox (mock)' },
];

export default function Activity() {
  const [tab, setTab] = useState('log');
  const [page, setPage] = useState(1);
  const path = tab === 'log' ? '/activity' : '/activity/emails';
  const { data, loading, error, reload } = useFetch(() => api.get(path, { page, limit: 15 }), [tab, page]);

  return (
    <>
      <PageHeader title="Activity" subtitle="An audit trail of who did what, plus every notification email the system has sent." />
      <div className="mb-4 inline-flex rounded-md border border-stone-300 p-0.5 dark:border-stone-700" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.value}
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => { setTab(t.value); setPage(1); }}
            className={`rounded px-3.5 py-1.5 text-sm font-semibold ${tab === t.value ? 'bg-brand-600 text-white' : 'text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <ErrorBanner message={error} onRetry={reload} />
      {!error && (
        <div className="card overflow-hidden">
          {loading && !data ? <PageLoader /> : data?.data.length === 0 ? (
            <EmptyState title="Nothing here yet" />
          ) : (
            <ul className={`divide-y divide-stone-100 dark:divide-stone-800 ${loading ? 'opacity-60' : ''}`}>
              {data.data.map((row) =>
                tab === 'log' ? (
                  <li key={row._id} className="flex items-start justify-between gap-4 px-5 py-3 text-sm">
                    <p>{row.message}</p>
                    <span className="muted shrink-0 text-xs">{timeAgo(row.createdAt)}</span>
                  </li>
                ) : (
                  <li key={row._id} className="px-5 py-3 text-sm">
                    <div className="flex items-start justify-between gap-4">
                      <p className="font-semibold">{row.subject}</p>
                      <span className="muted shrink-0 text-xs">{timeAgo(row.createdAt)}</span>
                    </div>
                    <p className="muted text-xs">To: {row.to}</p>
                    <p className="mt-1">{row.body}</p>
                  </li>
                )
              )}
            </ul>
          )}
          <Pagination meta={data?.meta} onPage={setPage} />
        </div>
      )}
    </>
  );
}
