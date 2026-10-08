import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useFetch } from '../lib/useFetch.js';
import { useAuth } from '../store/auth.js';
import { toast } from '../store/toast.js';
import { INTERVIEW_TYPES, labelOf } from '../lib/constants.js';
import { timeAgo } from '../lib/format.js';
import FeedbackForm from '../components/FeedbackForm.jsx';
import { EmptyState, ErrorBanner, Modal, PageHeader, PageLoader, Pagination, RecommendationBadge, Stars } from '../components/ui.jsx';

export default function FeedbackPage() {
  const user = useAuth((s) => s.user);
  const isRecruiter = user.role === 'recruiter';
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const { data, loading, error, reload } = useFetch(() => api.get('/feedback', { page, limit: 10 }), [page]);

  async function remove(f) {
    if (!window.confirm('Delete this feedback?')) return;
    try {
      await api.del(`/feedback/${f._id}`);
      toast.success('Feedback deleted');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <>
      <PageHeader
        title="Feedback"
        subtitle={isRecruiter ? 'What interviewers said about your candidates.' : 'Feedback you have submitted. Submit new feedback from the Interviews page.'}
      />
      <ErrorBanner message={error} onRetry={reload} />
      {!error && (
        <div className="card overflow-hidden">
          {loading && !data ? <PageLoader /> : data?.data.length === 0 ? (
            <EmptyState title="No feedback yet" hint={isRecruiter ? 'Feedback appears once interviewers submit it.' : 'Complete an interview and submit your feedback.'} />
          ) : (
            <ul className={`divide-y divide-stone-100 dark:divide-stone-800 ${loading ? 'opacity-60' : ''}`}>
              {data.data.map((f) => (
                <li key={f._id} className="space-y-2 px-5 py-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <Link to={`/candidates/${f.candidate._id}`} className="font-semibold hover:underline">{f.candidate.name}</Link>
                      <p className="muted">
                        {labelOf(INTERVIEW_TYPES, f.interview?.type)} interview · by {f.interviewer.name} · {timeAgo(f.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Stars value={f.rating} />
                      <RecommendationBadge value={f.recommendation} />
                    </div>
                  </div>
                  {f.strengths && <p><span className="font-semibold">Strengths: </span>{f.strengths}</p>}
                  {f.concerns && <p><span className="font-semibold">Concerns: </span>{f.concerns}</p>}
                  {f.comments && <p className="muted">{f.comments}</p>}
                  <div className="flex gap-2 pt-1">
                    {f.interviewer._id === user._id && <button className="btn-secondary btn-sm" onClick={() => setEditing(f)}>Edit</button>}
                    {(isRecruiter || f.interviewer._id === user._id) && <button className="btn-danger btn-sm" onClick={() => remove(f)}>Delete</button>}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Pagination meta={data?.meta} onPage={setPage} />
        </div>
      )}
      {editing && (
        <Modal title={`Feedback: ${editing.candidate.name}`} onClose={() => setEditing(null)}>
          <FeedbackForm existing={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />
        </Modal>
      )}
    </>
  );
}
