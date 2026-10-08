import { useState } from 'react';
import { api, fieldErrors } from '../lib/api.js';
import { toast } from '../store/toast.js';
import { ErrorBanner, Field, Spinner } from './ui.jsx';

export default function CandidateForm({ candidate, onSaved, onClose }) {
  const editing = !!candidate;
  const [form, setForm] = useState({
    name: candidate?.name || '',
    email: candidate?.email || '',
    phone: candidate?.phone || '',
    position: candidate?.position || '',
    skills: candidate?.skills?.join(', ') || '',
    experienceYears: candidate?.experienceYears ?? 0,
    source: candidate?.source || '',
    resumeUrl: candidate?.resumeUrl || '',
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
    const payload = {
      ...form,
      experienceYears: Number(form.experienceYears) || 0,
      skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean),
    };
    try {
      const res = editing ? await api.put(`/candidates/${candidate._id}`, payload) : await api.post('/candidates', payload);
      toast.success(editing ? 'Candidate updated' : 'Candidate added');
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
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" error={errors.name}>
          <input className="input" value={form.name} onChange={set('name')} required />
        </Field>
        <Field label="Email" error={errors.email}>
          <input className="input" type="email" value={form.email} onChange={set('email')} required />
        </Field>
        <Field label="Position applied for" error={errors.position}>
          <input className="input" value={form.position} onChange={set('position')} required />
        </Field>
        <Field label="Phone" error={errors.phone}>
          <input className="input" value={form.phone} onChange={set('phone')} />
        </Field>
        <Field label="Experience (years)" error={errors.experienceYears}>
          <input className="input" type="number" min="0" step="0.5" value={form.experienceYears} onChange={set('experienceYears')} />
        </Field>
        <Field label="Source" error={errors.source}>
          <input className="input" value={form.source} onChange={set('source')} placeholder="LinkedIn, referral..." />
        </Field>
      </div>
      <Field label="Skills" hint="Separate skills with commas" error={errors.skills}>
        <input className="input" value={form.skills} onChange={set('skills')} placeholder="React, Node.js, MongoDB" />
      </Field>
      <Field label="Resume link" error={errors.resumeUrl}>
        <input className="input" value={form.resumeUrl} onChange={set('resumeUrl')} placeholder="https://..." />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" disabled={saving}>
          {saving && <Spinner className="h-4 w-4 !text-white" />} {editing ? 'Save changes' : 'Add candidate'}
        </button>
      </div>
    </form>
  );
}
