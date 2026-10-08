import { useState } from 'react';
import { api, fieldErrors } from '../lib/api.js';
import { useFetch } from '../lib/useFetch.js';
import { toLocalInput } from '../lib/format.js';
import { INTERVIEW_MODES, INTERVIEW_TYPES } from '../lib/constants.js';
import { toast } from '../store/toast.js';
import { ErrorBanner, Field, Spinner } from './ui.jsx';

/** Schedule (or edit) an interview. Pass `candidate` to lock the candidate field. */
export default function InterviewForm({ interview, candidate, onSaved, onClose }) {
  const editing = !!interview;
  const interviewers = useFetch(() => api.get('/users', { role: 'interviewer' }), []);
  const candidates = useFetch(() => (candidate ? Promise.resolve(null) : api.get('/candidates', { limit: 200, sort: 'name' })), []);

  const [form, setForm] = useState({
    candidate: interview?.candidate?._id || candidate?._id || '',
    interviewer: interview?.interviewer?._id || '',
    scheduledAt: interview ? toLocalInput(interview.scheduledAt) : '',
    durationMins: interview?.durationMins || 60,
    type: interview?.type || 'technical',
    mode: interview?.mode || 'video',
    location: interview?.location || '',
    notes: interview?.notes || '',
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    setFormError('');
    if (!form.scheduledAt) {
      setErrors({ scheduledAt: 'Choose a date and time' });
      setSaving(false);
      return;
    }
    const payload = { ...form, durationMins: Number(form.durationMins), scheduledAt: new Date(form.scheduledAt).toISOString() };
    try {
      const res = editing ? await api.put(`/interviews/${interview._id}`, payload) : await api.post('/interviews', payload);
      toast.success(editing ? 'Interview updated' : 'Interview scheduled');
      onSaved(res.data);
    } catch (err) {
      setErrors(fieldErrors(err));
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const loadError = interviewers.error || candidates.error;

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <ErrorBanner message={loadError} />
      <ErrorBanner message={formError} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Candidate" error={errors.candidate}>
          {candidate ? (
            <input className="input" value={candidate.name} disabled />
          ) : (
            <select className="input" value={form.candidate} onChange={set('candidate')} disabled={editing}>
              <option value="">Select candidate</option>
              {candidates.data?.data.map((c) => (
                <option key={c._id} value={c._id}>{c.name} - {c.position}</option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Interviewer" error={errors.interviewer}>
          <select className="input" value={form.interviewer} onChange={set('interviewer')}>
            <option value="">Select interviewer</option>
            {interviewers.data?.data.map((u) => (
              <option key={u._id} value={u._id}>{u.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Date and time" error={errors.scheduledAt}>
          <input className="input" type="datetime-local" value={form.scheduledAt} onChange={set('scheduledAt')} />
        </Field>
        <Field label="Duration (minutes)" error={errors.durationMins}>
          <input className="input" type="number" min="15" max="480" step="15" value={form.durationMins} onChange={set('durationMins')} />
        </Field>
        <Field label="Round" error={errors.type}>
          <select className="input" value={form.type} onChange={set('type')}>
            {INTERVIEW_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="Mode" error={errors.mode}>
          <select className="input" value={form.mode} onChange={set('mode')}>
            {INTERVIEW_MODES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Meeting link or room" error={errors.location}>
        <input className="input" value={form.location} onChange={set('location')} placeholder="https://meet... or Room 4B" />
      </Field>
      <Field label="Notes for the interviewer" error={errors.notes}>
        <textarea className="input" rows={3} value={form.notes} onChange={set('notes')} />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" disabled={saving}>
          {saving && <Spinner className="h-4 w-4 !text-white" />} {editing ? 'Save changes' : 'Schedule interview'}
        </button>
      </div>
    </form>
  );
}
