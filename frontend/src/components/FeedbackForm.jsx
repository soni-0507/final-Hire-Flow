import { useState } from 'react';
import { api, fieldErrors } from '../lib/api.js';
import { RECOMMENDATIONS } from '../lib/constants.js';
import { toast } from '../store/toast.js';
import { ErrorBanner, Field, Spinner, Stars } from './ui.jsx';

/** Submit new feedback for `interviewId`, or edit `existing` feedback. */
export default function FeedbackForm({ interviewId, existing, onSaved, onClose }) {
  const editing = !!existing;
  const [form, setForm] = useState({
    rating: existing?.rating || 0,
    recommendation: existing?.recommendation || '',
    strengths: existing?.strengths || '',
    concerns: existing?.concerns || '',
    comments: existing?.comments || '',
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setErrors({});
    setFormError('');
    if (!form.rating) return setErrors({ rating: 'Choose a rating from 1 to 5' });
    if (!form.recommendation) return setErrors({ recommendation: 'Select a recommendation' });
    setSaving(true);
    try {
      const res = editing
        ? await api.put(`/feedback/${existing._id}`, form)
        : await api.post('/feedback', { ...form, interview: interviewId });
      toast.success(editing ? 'Feedback updated' : 'Feedback submitted');
      onSaved(res.data);
    } catch (err) {
      setErrors(fieldErrors(err));
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <ErrorBanner message={formError} />
      <Field label="Overall rating" error={errors.rating}>
        <Stars value={form.rating} onChange={(rating) => setForm({ ...form, rating })} />
      </Field>
      <Field label="Recommendation" error={errors.recommendation}>
        <select className="input" value={form.recommendation} onChange={set('recommendation')}>
          <option value="">Select recommendation</option>
          {RECOMMENDATIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </Field>
      <Field label="Strengths" error={errors.strengths}>
        <textarea className="input" rows={3} value={form.strengths} onChange={set('strengths')} />
      </Field>
      <Field label="Concerns" error={errors.concerns}>
        <textarea className="input" rows={3} value={form.concerns} onChange={set('concerns')} />
      </Field>
      <Field label="Additional comments" error={errors.comments}>
        <textarea className="input" rows={2} value={form.comments} onChange={set('comments')} />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" disabled={saving}>
          {saving && <Spinner className="h-4 w-4 !text-white" />} {editing ? 'Save feedback' : 'Submit feedback'}
        </button>
      </div>
    </form>
  );
}
