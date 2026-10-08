import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useFetch } from '../lib/useFetch.js';
import { useAuth } from '../store/auth.js';
import { toast } from '../store/toast.js';
import { INTERVIEW_TYPES, REJECTION_REASONS, STAGE_STYLES, labelOf, nextStages } from '../lib/constants.js';
import { fmtDate, fmtDateTime, timeAgo } from '../lib/format.js';
import { downloadIcs } from '../lib/ics.js';
import CandidateForm from '../components/CandidateForm.jsx';
import InterviewForm from '../components/InterviewForm.jsx';
import RejectModal from '../components/RejectModal.jsx';
import { Avatar, EmptyState, ErrorBanner, Modal, PageLoader, RecommendationBadge, Spinner, Stars, StageBadge } from '../components/ui.jsx';
import StageStepper from '../components/StageStepper.jsx';
import { celebrate } from '../lib/confetti.js';

const DAY = 86400000;
const fmtDays = (d) => (d == null ? '' : d < 1 ? '<1d' : `${Math.round(d)}d`);
const fmtSize = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

export default function CandidateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const isRecruiter = user.role === 'recruiter';
  const fileRef = useRef(null);

  const cand = useFetch(() => api.get(`/candidates/${id}`), [id]);
  const interviews = useFetch(() => api.get('/interviews', { candidate: id, limit: 50 }), [id]);
  const feedback = useFetch(() => api.get('/feedback', { candidate: id, limit: 50 }), [id]);

  const [modal, setModal] = useState(null); // 'edit' | 'schedule' | 'reject'
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  if (cand.loading && !cand.data) return <PageLoader />;
  if (cand.error) {
    return (
      <div className="space-y-4">
        <ErrorBanner message={cand.error} onRetry={cand.reload} />
        <Link to="/candidates" className="btn-secondary">Back to candidates</Link>
      </div>
    );
  }
  const c = cand.data.data;
  const allowed = nextStages(c.stage);
  const nextStage = allowed.find((s) => s !== 'Rejected');
  const locked = allowed.length === 0;
  const active = !locked;

  async function changeStage(stage, extra = {}) {
    try {
      await api.patch(`/candidates/${id}/stage`, { stage, ...extra });
      toast.success(stage === 'Rejected' ? 'Candidate rejected' : `Moved to ${stage}`);
      if (stage === 'Hired') celebrate();
      cand.reload();
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  }

  async function remove() {
    if (!window.confirm(`Delete ${c.name}? Their interviews, feedback and resume will be deleted too.`)) return;
    try {
      await api.del(`/candidates/${id}`);
      toast.success('Candidate deleted');
      navigate('/candidates', { replace: true });
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function addNote(e) {
    e.preventDefault();
    if (!note.trim()) return;
    setBusy(true);
    try {
      await api.post(`/candidates/${id}/notes`, { text: note });
      setNote('');
      cand.reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteNote(noteId) {
    try {
      await api.del(`/candidates/${id}/notes/${noteId}`);
      cand.reload();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function uploadResume(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/\.(pdf|docx?)$/i.test(file.name)) return toast.error('Choose a PDF, DOC or DOCX file');
    if (file.size > 5 * 1024 * 1024) return toast.error('File is too large (max 5 MB)');
    const fd = new FormData();
    fd.append('resume', file);
    setUploading(true);
    try {
      await api.upload(`/candidates/${id}/resume`, fd);
      toast.success('Resume uploaded');
      cand.reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  }

  const downloadResume = () =>
    api.download(`/candidates/${id}/resume`, c.resumeFile.originalName).catch((err) => toast.error(err.message));

  async function removeResume() {
    if (!window.confirm('Remove this resume?')) return;
    try {
      await api.del(`/candidates/${id}/resume`);
      cand.reload();
    } catch (err) {
      toast.error(err.message);
    }
  }

  // time spent in each stage, oldest first
  const hist = c.stageHistory.map((h, k) => {
    const next = c.stageHistory[k + 1];
    const end = next ? new Date(next.changedAt).getTime() : active ? Date.now() : null;
    return { ...h, days: end ? (end - new Date(h.changedAt).getTime()) / DAY : null, ongoing: !next && active };
  });

  const detail = (label, value) => (
    <div>
      <dt className="muted text-xs">{label}</dt>
      <dd className="text-sm font-medium">{value || '-'}</dd>
    </div>
  );

  return (
    <>
      <Link to="/candidates" className="muted hover:underline">&larr; All candidates</Link>

      <div className="mb-6 mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={c.name} size="h-16 w-16 text-xl" />
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">{c.name}</h1>
            <p className="muted mt-1">{c.position}</p>
            <div className="mt-2"><StageBadge stage={c.stage} /></div>
          </div>
        </div>
        {isRecruiter && (
          <div className="flex flex-wrap items-center gap-2">
            {locked ? (
              <span className="muted rounded-md border border-stone-300 px-3 py-2 dark:border-stone-700">Stage locked: {c.stage}</span>
            ) : (
              <>
                <button className="btn-primary" onClick={() => changeStage(nextStage).catch(() => {})}>Move to {nextStage}</button>
                <button className="btn-danger" onClick={() => setModal('reject')}>Reject</button>
              </>
            )}
            <button className="btn-secondary" onClick={() => setModal('schedule')}>Schedule interview</button>
            <button className="btn-secondary" onClick={() => setModal('edit')}>Edit</button>
            <button className="btn-danger" onClick={remove}>Delete</button>
          </div>
        )}
      </div>

      <section className="card mb-6 overflow-x-auto p-5">
        <StageStepper stage={c.stage} history={c.stageHistory} />
      </section>

      {c.stage === 'Rejected' && isRecruiter && (
        <div className="mb-6 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
          <p className="font-semibold">Rejected: {labelOf(REJECTION_REASONS, c.rejectionReason) || 'No reason recorded'}</p>
          {c.rejectionNote && <p className="mt-0.5">{c.rejectionNote}</p>}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-5">
            <h2 className="mb-4 text-lg font-bold">Details</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              {detail('Email', c.email)}
              {detail('Phone', c.phone)}
              {detail('Experience', `${c.experienceYears} years`)}
              {detail('Source', c.source)}
              {detail('Added', `${fmtDate(c.createdAt)}${c.createdBy ? ` by ${c.createdBy.name}` : ''}`)}
              <div>
                <dt className="muted text-xs">Resume link</dt>
                <dd className="text-sm font-medium">
                  {c.resumeUrl ? <a href={c.resumeUrl} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline dark:text-brand-400">Open link</a> : '-'}
                </dd>
              </div>
            </dl>
            {c.skills.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {c.skills.map((s) => <span key={s} className="rounded-md bg-stone-100 px-2 py-0.5 text-xs font-medium dark:bg-stone-800">{s}</span>)}
              </div>
            )}
          </section>

          <section className="card">
            <h2 className="px-5 pt-5 text-lg font-bold">Interviews</h2>
            {interviews.loading && !interviews.data ? <PageLoader /> : interviews.error ? (
              <div className="p-5"><ErrorBanner message={interviews.error} onRetry={interviews.reload} /></div>
            ) : interviews.data.data.length === 0 ? (
              <EmptyState title="No interviews yet" hint={isRecruiter ? 'Schedule the first round for this candidate.' : undefined} />
            ) : (
              <ul className="mt-2 divide-y divide-stone-100 dark:divide-stone-800">
                {interviews.data.data.map((i) => (
                  <li key={i._id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                    <div>
                      <p className="font-semibold">{labelOf(INTERVIEW_TYPES, i.type)} interview</p>
                      <p className="muted">{fmtDateTime(i.scheduledAt)} · {i.interviewer.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {i.status === 'scheduled' && <button className="btn-secondary btn-sm" onClick={() => downloadIcs(i)}>Add to calendar</button>}
                      <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold capitalize dark:bg-stone-800">{i.status}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card">
            <h2 className="px-5 pt-5 text-lg font-bold">{isRecruiter ? 'Interviewer feedback' : 'Your feedback'}</h2>
            {feedback.loading && !feedback.data ? <PageLoader /> : feedback.error ? (
              <div className="p-5"><ErrorBanner message={feedback.error} onRetry={feedback.reload} /></div>
            ) : feedback.data.data.length === 0 ? (
              <EmptyState title="No feedback yet" hint="Feedback is optional and never blocks a candidate from moving forward." />
            ) : (
              <ul className="mt-2 divide-y divide-stone-100 dark:divide-stone-800">
                {feedback.data.data.map((f) => (
                  <li key={f._id} className="space-y-2 px-5 py-4 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold">{f.interviewer.name} <span className="muted font-normal">· {timeAgo(f.createdAt)}</span></p>
                      <div className="flex items-center gap-3"><Stars value={f.rating} /><RecommendationBadge value={f.recommendation} /></div>
                    </div>
                    {f.strengths && <p><span className="font-semibold">Strengths: </span>{f.strengths}</p>}
                    {f.concerns && <p><span className="font-semibold">Concerns: </span>{f.concerns}</p>}
                    {f.comments && <p className="muted">{f.comments}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-6">
          {isRecruiter && (
            <section className="card p-5">
              <h2 className="mb-2 text-lg font-bold">Interview score</h2>
              {c.ratingCount ? (
                <>
                  <div className="flex items-center gap-3">
                    <span className="font-display text-4xl font-bold">{c.ratingAvg.toFixed(1)}</span>
                    <Stars value={Math.round(c.ratingAvg)} />
                  </div>
                  <p className="muted mt-1">{c.ratingCount} feedback · {c.hireVotes} hire · {c.noHireVotes} no hire</p>
                </>
              ) : (
                <p className="muted">No ratings yet. The score appears once an interviewer shares feedback.</p>
              )}
            </section>
          )}

          <section className="card p-5">
            <h2 className="mb-3 text-lg font-bold">Resume</h2>
            {c.resumeFile?.originalName ? (
              <div className="space-y-3">
                <div>
                  <p className="truncate text-sm font-semibold">{c.resumeFile.originalName}</p>
                  <p className="muted text-xs">{fmtSize(c.resumeFile.size)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="btn-primary btn-sm" onClick={downloadResume}>Download</button>
                  {isRecruiter && <button className="btn-secondary btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>Replace</button>}
                  {isRecruiter && <button className="btn-danger btn-sm" onClick={removeResume}>Remove</button>}
                </div>
              </div>
            ) : (
              <div>
                <p className="muted mb-3">No resume file uploaded.</p>
                {isRecruiter && (
                  <button className="btn-secondary btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                    {uploading && <Spinner className="h-3 w-3" />} Upload PDF or Word file
                  </button>
                )}
              </div>
            )}
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={uploadResume} />
          </section>

          <section className="card p-5">
            <h2 className="mb-3 text-lg font-bold">Notes</h2>
            <form onSubmit={addNote} className="mb-4">
              <textarea className="input" rows={3} placeholder="Add a note for the hiring team" value={note} onChange={(e) => setNote(e.target.value)} aria-label="New note" />
              <button className="btn-primary btn-sm mt-2" disabled={busy || !note.trim()}>
                {busy && <Spinner className="h-3 w-3 !text-white" />} Add note
              </button>
            </form>
            {c.notes.length === 0 ? <p className="muted">No notes yet.</p> : (
              <ul className="space-y-3">
                {[...c.notes].reverse().map((n) => (
                  <li key={n._id} className="rounded-md bg-stone-50 p-3 text-sm dark:bg-stone-900">
                    <p>{n.text}</p>
                    <div className="muted mt-1.5 flex items-center justify-between text-xs">
                      <span>{n.authorName} ({n.role}) · {timeAgo(n.createdAt)}</span>
                      {(isRecruiter || n.author === user._id) && <button className="hover:text-rose-600 hover:underline" onClick={() => deleteNote(n._id)}>Delete</button>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-5">
            <h2 className="mb-3 text-lg font-bold">Stage history</h2>
            <ol className="space-y-3">
              {[...hist].reverse().map((h, idx) => (
                <li key={idx} className="flex items-center gap-3 text-sm">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${STAGE_STYLES[h.stage]?.bar}`} />
                  <span className="font-medium">{h.stage}</span>
                  <span className="muted ml-auto text-right text-xs">
                    {fmtDate(h.changedAt)}
                    {h.days != null && <span className="block">{fmtDays(h.days)}{h.ongoing ? ' so far' : ''}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>

      {modal === 'edit' && (
        <Modal title="Edit candidate" onClose={() => setModal(null)} wide>
          <CandidateForm candidate={c} onClose={() => setModal(null)} onSaved={() => { setModal(null); cand.reload(); }} />
        </Modal>
      )}
      {modal === 'schedule' && (
        <Modal title="Schedule interview" onClose={() => setModal(null)} wide>
          <InterviewForm candidate={c} onClose={() => setModal(null)} onSaved={() => { setModal(null); interviews.reload(); }} />
        </Modal>
      )}
      {modal === 'reject' && (
        <RejectModal
          name={c.name}
          onClose={() => setModal(null)}
          onConfirm={async (rejectionReason, rejectionNote) => {
            await changeStage('Rejected', { rejectionReason, rejectionNote });
            setModal(null);
          }}
        />
      )}
    </>
  );
}
