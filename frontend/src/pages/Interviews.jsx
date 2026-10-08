import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useFetch } from '../lib/useFetch.js';
import { useAuth } from '../store/auth.js';
import { toast } from '../store/toast.js';
import { INTERVIEW_MODES, INTERVIEW_TYPES, labelOf } from '../lib/constants.js';
import { fmtDateTime } from '../lib/format.js';
import { downloadIcs } from '../lib/ics.js';
import InterviewForm from '../components/InterviewForm.jsx';
import FeedbackForm from '../components/FeedbackForm.jsx';
import CalendarView from '../components/CalendarView.jsx';
import { EmptyState, ErrorBanner, Modal, PageHeader, PageLoader, Pagination } from '../components/ui.jsx';

const TABS = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
  { value: '', label: 'All' },
];

const STATUS_STYLES = {
  scheduled: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
  completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  cancelled: 'bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
};

const Segmented = ({ options, value, onChange }) => (
  <div className="inline-flex rounded-md border border-stone-300 p-0.5 dark:border-stone-700" role="tablist">
    {options.map((t) => (
      <button
        key={t.label}
        role="tab"
        aria-selected={value === t.value}
        onClick={() => onChange(t.value)}
        className={`rounded px-3.5 py-1.5 text-sm font-semibold ${value === t.value ? 'bg-brand-600 text-white' : 'text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800'}`}
      >
        {t.label}
      </button>
    ))}
  </div>
);

export default function Interviews() {
  const isRecruiter = useAuth((s) => s.user.role === 'recruiter');
  const [view, setView] = useState('list');
  const [tab, setTab] = useState('upcoming');
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const [modal, setModal] = useState(null); // {type:'schedule'|'edit'|'feedback', interview?, existing?}
  const { data, loading, error, reload } = useFetch(() => api.get('/interviews', { when: tab, page, limit: 10 }), [tab, page, version]);
  const refresh = () => setVersion((v) => v + 1);

  async function cancel(i) {
    if (!window.confirm(`Cancel the interview with ${i.candidate.name}? The candidate will be notified.`)) return;
    try {
      await api.patch(`/interviews/${i._id}`, { status: 'cancelled' });
      toast.success('Interview cancelled');
      refresh();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function remove(i) {
    if (!window.confirm('Delete this interview and its feedback?')) return;
    try {
      await api.del(`/interviews/${i._id}`);
      toast.success('Interview deleted');
      refresh();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function openFeedback(i) {
    if (!i.feedbackId) return setModal({ type: 'feedback', interview: i });
    try {
      const res = await api.get(`/feedback/${i.feedbackId}`);
      setModal({ type: 'feedback', interview: i, existing: res.data });
    } catch (err) {
      toast.error(err.message);
    }
  }

  const close = () => setModal(null);
  const saved = () => { close(); refresh(); };

  // one row, reused by the list and by the calendar's day panel
  const renderRow = (i) => {
    const past = new Date(i.scheduledAt) < new Date();
    const canGiveFeedback = !isRecruiter && i.status !== 'cancelled' && !i.feedbackId && past;
    return (
      <li key={i._id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="min-w-0">
          <Link to={`/candidates/${i.candidate._id}`} className="font-semibold hover:underline">{i.candidate.name}</Link>
          <p className="muted">
            {labelOf(INTERVIEW_TYPES, i.type)} · {labelOf(INTERVIEW_MODES, i.mode)} · {i.durationMins} min
            {isRecruiter && ` · ${i.interviewer.name}`}
          </p>
          {i.location && <p className="muted truncate text-xs">{i.location}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{fmtDateTime(i.scheduledAt)}</span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[i.status]}`}>{i.status}</span>
          {canGiveFeedback && <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-300">Feedback optional</span>}
          {i.status === 'scheduled' && <button className="btn-secondary btn-sm" onClick={() => downloadIcs(i)}>Add to calendar</button>}
          {isRecruiter ? (
            <>
              {i.status === 'scheduled' && <button className="btn-secondary btn-sm" onClick={() => setModal({ type: 'edit', interview: i })}>Edit</button>}
              {i.status === 'scheduled' && <button className="btn-secondary btn-sm" onClick={() => cancel(i)}>Cancel</button>}
              <button className="btn-danger btn-sm" onClick={() => remove(i)}>Delete</button>
            </>
          ) : (
            i.status !== 'cancelled' && (
              <button className={i.feedbackId ? 'btn-secondary btn-sm' : 'btn-primary btn-sm'} onClick={() => openFeedback(i)}>
                {i.feedbackId ? 'Edit feedback' : 'Add feedback'}
              </button>
            )
          )}
        </div>
      </li>
    );
  };

  return (
    <>
      <PageHeader
        title="Interviews"
        subtitle={isRecruiter ? 'Everything on the interview calendar.' : 'Interviews assigned to you. Sharing feedback is optional.'}
        actions={isRecruiter && <button className="btn-primary" onClick={() => setModal({ type: 'schedule' })}>Schedule interview</button>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented options={[{ value: 'list', label: 'List' }, { value: 'calendar', label: 'Calendar' }]} value={view} onChange={setView} />
        {view === 'list' && <Segmented options={TABS} value={tab} onChange={(v) => { setTab(v); setPage(1); }} />}
      </div>

      {view === 'calendar' ? (
        <CalendarView version={version} renderRow={renderRow} />
      ) : (
        <>
          <ErrorBanner message={error} onRetry={reload} />
          {!error && (
            <div className="card overflow-hidden">
              {loading && !data ? <PageLoader /> : data?.data.length === 0 ? (
                <EmptyState title={`No ${tab || ''} interviews`.replace('  ', ' ')} hint={isRecruiter ? 'Schedule an interview to see it here.' : 'Interviews assigned to you will appear here.'} />
              ) : (
                <ul className={`divide-y divide-stone-100 dark:divide-stone-800 ${loading ? 'opacity-60' : ''}`}>{data.data.map(renderRow)}</ul>
              )}
              <Pagination meta={data?.meta} onPage={setPage} />
            </div>
          )}
        </>
      )}

      {modal?.type === 'schedule' && (
        <Modal title="Schedule interview" onClose={close} wide>
          <InterviewForm onClose={close} onSaved={saved} />
        </Modal>
      )}
      {modal?.type === 'edit' && (
        <Modal title="Edit interview" onClose={close} wide>
          <InterviewForm interview={modal.interview} onClose={close} onSaved={saved} />
        </Modal>
      )}
      {modal?.type === 'feedback' && (
        <Modal title={`Feedback: ${modal.interview.candidate.name}`} onClose={close}>
          <FeedbackForm interviewId={modal.interview._id} existing={modal.existing} onClose={close} onSaved={saved} />
        </Modal>
      )}
    </>
  );
}
