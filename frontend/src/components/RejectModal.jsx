import { useState } from 'react';
import { REJECTION_REASONS } from '../lib/constants.js';
import { ErrorBanner, Field, Modal, Spinner } from './ui.jsx';

/** Asks for a rejection reason. `onConfirm(reason, note)` should throw on failure and close the modal on success. */
export default function RejectModal({ name, onConfirm, onClose }) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!reason) return setError('Select a reason so the team can learn from it');
    setBusy(true);
    setError('');
    try {
      await onConfirm(reason, note);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal title={`Reject ${name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <ErrorBanner message={error} />
        <p className="muted">The candidate will be emailed and this cannot be undone: rejected candidates are locked.</p>
        <Field label="Reason">
          <select className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="">Select a reason</option>
            {REJECTION_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </Field>
        <Field label="Note (optional)">
          <textarea className="input" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-danger" disabled={busy}>{busy && <Spinner className="h-4 w-4" />} Reject candidate</button>
        </div>
      </form>
    </Modal>
  );
}
