import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useFetch } from '../lib/useFetch.js';
import { useAuth } from '../store/auth.js';
import { toast } from '../store/toast.js';
import { STAGES } from '../lib/constants.js';
import { fmtDate } from '../lib/format.js';
import CandidateForm from '../components/CandidateForm.jsx';
import { Avatar, EmptyState, ErrorBanner, Modal, PageHeader, Pagination, SkeletonList, StageBadge } from '../components/ui.jsx';

const SORTS = [
  { value: '-createdAt', label: 'Newest first' },
  { value: 'createdAt', label: 'Oldest first' },
  { value: 'name', label: 'Name A-Z' },
  { value: '-experienceYears', label: 'Most experienced' },
  { value: '-ratingAvg', label: 'Highest rated' },
  { value: 'ratingAvg', label: 'Lowest rated' },
];

export default function Candidates() {
  const isRecruiter = useAuth((s) => s.user.role === 'recruiter');
  // scores are recruiter-only
  const sorts = isRecruiter ? SORTS : SORTS.filter((s) => !s.value.includes('ratingAvg'));
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ q: '', stage: '', position: '', skill: '', minExp: '', sort: '-createdAt', page: 1 });
  const [showMore, setShowMore] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function exportCsv() {
    setExporting(true);
    try {
      await api.download('/candidates/export', 'candidates.csv', {
        q: filters.q, stage: filters.stage, position: filters.position, skill: filters.skill, minExp: filters.minExp, sort: filters.sort,
      });
      toast.success('Candidate list exported');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setExporting(false);
    }
  }

  // debounce free-text search so we don't hit the API on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setFilters((f) => (f.q === search ? f : { ...f, q: search, page: 1 })), 350);
    return () => clearTimeout(t);
  }, [search]);

  const setFilter = (k) => (e) => setFilters({ ...filters, [k]: e.target.value, page: 1 });
  const { data, loading, error, reload } = useFetch(
    () => api.get('/candidates', { ...filters, limit: 10 }),
    [filters.q, filters.stage, filters.position, filters.skill, filters.minExp, filters.sort, filters.page]
  );

  const reset = () => {
    setSearch('');
    setFilters({ q: '', stage: '', position: '', skill: '', minExp: '', sort: '-createdAt', page: 1 });
  };
  const hasFilters = filters.q || filters.stage || filters.position || filters.skill || filters.minExp;

  return (
    <>
      <PageHeader
        title="Candidates"
        subtitle={isRecruiter ? 'Everyone in your hiring pipeline.' : 'Candidates assigned to you for interviews.'}
        actions={
          isRecruiter && (
            <>
              <button className="btn-secondary" onClick={exportCsv} disabled={exporting}>{exporting ? 'Exporting...' : 'Export CSV'}</button>
              <button className="btn-primary" onClick={() => setAdding(true)}>Add candidate</button>
            </>
          )
        }
      />

      <div className="card mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_12rem_11rem]">
          <input className="input" placeholder="Search name, email, position or skill" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search candidates" />
          <select className="input" value={filters.stage} onChange={setFilter('stage')} aria-label="Filter by stage">
            <option value="">All stages</option>
            {STAGES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select className="input" value={filters.sort} onChange={setFilter('sort')} aria-label="Sort">
            {sorts.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div className="mt-3 flex items-center gap-4 text-sm">
          <button className="font-semibold text-brand-600 hover:underline dark:text-brand-400" onClick={() => setShowMore(!showMore)}>
            {showMore ? 'Fewer filters' : 'More filters'}
          </button>
          {hasFilters && <button className="muted hover:underline" onClick={reset}>Clear all</button>}
        </div>
        {showMore && (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <input className="input" placeholder="Position" value={filters.position} onChange={setFilter('position')} aria-label="Position" />
            <input className="input" placeholder="Exact skill, e.g. React" value={filters.skill} onChange={setFilter('skill')} aria-label="Skill" />
            <input className="input" type="number" min="0" placeholder="Min. years of experience" value={filters.minExp} onChange={setFilter('minExp')} aria-label="Minimum experience" />
          </div>
        )}
      </div>

      <ErrorBanner message={error} onRetry={reload} />

      {!error && (
        <div className="card overflow-hidden">
          {loading && !data ? (
            <SkeletonList rows={6} />
          ) : data?.data.length === 0 ? (
            <EmptyState
              title={hasFilters ? 'No candidates match these filters' : 'No candidates yet'}
              hint={hasFilters ? 'Try a different search or clear the filters.' : isRecruiter ? 'Add your first candidate to start the pipeline.' : 'Candidates appear here once a recruiter schedules you for an interview.'}
              action={hasFilters ? <button className="btn-secondary" onClick={reset}>Clear filters</button> : isRecruiter && <button className="btn-primary" onClick={() => setAdding(true)}>Add candidate</button>}
            />
          ) : (
            <div className={`overflow-x-auto ${loading ? 'opacity-60' : ''}`}>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-stone-200 dark:border-stone-800">
                    <th className="th">Candidate</th>
                    <th className="th hidden md:table-cell">Position</th>
                    <th className="th">Stage</th>
                    <th className="th hidden lg:table-cell">Experience</th>
                    <th className="th hidden lg:table-cell">Skills</th>
                    {isRecruiter && <th className="th hidden md:table-cell">Score</th>}
                    <th className="th hidden sm:table-cell">Added</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((c) => (
                    <tr key={c._id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50 dark:border-stone-800 dark:hover:bg-stone-800/40">
                      <td className="td">
                        <div className="flex items-center gap-3">
                          <Avatar name={c.name} />
                          <div className="min-w-0">
                            <Link to={`/candidates/${c._id}`} className="block truncate font-semibold hover:underline">{c.name}</Link>
                            <p className="muted truncate text-xs">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="td hidden md:table-cell">{c.position}</td>
                      <td className="td"><StageBadge stage={c.stage} /></td>
                      <td className="td hidden lg:table-cell">{c.experienceYears} yrs</td>
                      <td className="td hidden max-w-[14rem] truncate lg:table-cell">{c.skills.join(', ') || '-'}</td>
                      {isRecruiter && (
                        <td className="td hidden md:table-cell">
                          {c.ratingCount ? <span className="font-semibold text-amber-600 dark:text-amber-400">{c.ratingAvg.toFixed(1)} <span className="muted font-normal">({c.ratingCount})</span></span> : <span className="muted">-</span>}
                        </td>
                      )}
                      <td className="td hidden sm:table-cell">{fmtDate(c.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination meta={data?.meta} onPage={(page) => setFilters({ ...filters, page })} />
        </div>
      )}

      {adding && (
        <Modal title="Add candidate" onClose={() => setAdding(false)} wide>
          <CandidateForm onClose={() => setAdding(false)} onSaved={(c) => navigate(`/candidates/${c._id}`)} />
        </Modal>
      )}
    </>
  );
}
