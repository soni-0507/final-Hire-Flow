import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useFetch } from '../lib/useFetch.js';
import { BOARD_ORDER, STAGE_STYLES, nextStages, transitionError } from '../lib/constants.js';
import { toast } from '../store/toast.js';
import RejectModal from '../components/RejectModal.jsx';
import { Avatar, ErrorBanner, PageHeader, PageLoader } from '../components/ui.jsx';
import { celebrate } from '../lib/confetti.js';

export default function Pipeline() {
  const { data, loading, error, reload } = useFetch(() => api.get('/candidates', { limit: 200, sort: 'name' }), []);
  const [items, setItems] = useState([]);
  const [dragId, setDragId] = useState(null);
  const [overStage, setOverStage] = useState(null);
  const [rejecting, setRejecting] = useState(null); // candidate id waiting for a reason

  useEffect(() => {
    if (data) setItems(data.data);
  }, [data]);

  const dragging = items.find((c) => c._id === dragId);
  const canDrop = (stage) => !!dragging && nextStages(dragging.stage).includes(stage);

  async function move(id, stage, extra = {}) {
    const current = items.find((c) => c._id === id);
    if (!current || current.stage === stage) return;
    const problem = transitionError(current.stage, stage);
    if (problem) return toast.error(problem);
    if (stage === 'Rejected' && !extra.rejectionReason) return setRejecting(id); // ask for a reason first

    const snapshot = items;
    setItems(items.map((c) => (c._id === id ? { ...c, stage } : c))); // optimistic
    try {
      await api.patch(`/candidates/${id}/stage`, { stage, ...extra });
      toast.success(`${current.name} moved to ${stage}`);
      if (stage === 'Hired') celebrate();
    } catch (err) {
      setItems(snapshot);
      toast.error(err.message);
      throw err;
    }
  }

  if (loading && !data) return <PageLoader />;
  const rejectTarget = items.find((c) => c._id === rejecting);

  return (
    <>
      <PageHeader
        title="Pipeline board"
        subtitle="Candidates move one stage at a time. Drag a card to the next column, or to Rejected. Touch screens can use the menu on each card."
      />
      <ErrorBanner message={error} onRetry={reload} />
      <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:-mx-8 sm:px-8">
        <div className="flex min-w-max gap-4">
          {BOARD_ORDER.map((stage) => {
            const cards = items.filter((c) => c.stage === stage);
            const valid = canDrop(stage);
            const dim = dragging && !valid && dragging.stage !== stage;
            return (
              <section
                key={stage}
                aria-label={stage}
                onDragOver={(e) => { if (valid) { e.preventDefault(); setOverStage(stage); } }}
                onDragLeave={() => setOverStage((s) => (s === stage ? null : s))}
                onDrop={(e) => {
                  e.preventDefault();
                  setOverStage(null);
                  const id = dragId;
                  setDragId(null);
                  if (id) move(id, stage).catch(() => {});
                }}
                className={`flex max-h-[70vh] w-64 shrink-0 flex-col rounded-lg border-t-4 bg-stone-100/70 transition-all dark:bg-stone-900/60 ${STAGE_STYLES[stage].rail} ${overStage === stage ? 'ring-2 ring-brand-500' : valid ? 'ring-1 ring-brand-400/60' : ''} ${dim ? 'opacity-40' : ''}`}
              >
                <header className="flex items-center justify-between px-3 py-2.5">
                  <h2 className="font-sans text-sm font-bold">{stage}</h2>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold dark:bg-stone-800">{cards.length}</span>
                </header>
                <div className="space-y-2 overflow-y-auto px-2 pb-2">
                  {cards.length === 0 && <p className="muted px-1 py-4 text-center text-xs">{valid ? 'Drop here' : 'Empty'}</p>}
                  {cards.map((c) => {
                    const options = nextStages(c.stage);
                    return (
                      <article
                        key={c._id}
                        draggable={options.length > 0}
                        onDragStart={(e) => { e.dataTransfer.setData('text/plain', c._id); e.dataTransfer.effectAllowed = 'move'; setDragId(c._id); }}
                        onDragEnd={() => { setDragId(null); setOverStage(null); }}
                        className={`card p-3 ${options.length ? 'cursor-grab active:cursor-grabbing' : ''} ${dragId === c._id ? 'opacity-40' : ''}`}
                      >
                        <div className="flex items-center gap-2">
                          <Avatar name={c.name} size="h-7 w-7 text-[11px]" />
                          <Link to={`/candidates/${c._id}`} className="min-w-0 truncate text-sm font-semibold hover:underline">{c.name}</Link>
                        </div>
                        <p className="muted truncate text-xs">{c.position}</p>
                        <p className="muted mt-1 text-xs">
                          {c.experienceYears} yrs{c.ratingCount ? ` · rated ${c.ratingAvg.toFixed(1)}` : ''}
                        </p>
                        {options.length > 0 ? (
                          <select
                            aria-label={`Change stage for ${c.name}`}
                            className="input mt-2 py-1 text-xs"
                            value={c.stage}
                            onChange={(e) => move(c._id, e.target.value).catch(() => {})}
                          >
                            <option value={c.stage}>{c.stage}</option>
                            {options.map((s) => <option key={s} value={s}>{s === 'Rejected' ? 'Reject...' : `Move to ${s}`}</option>)}
                          </select>
                        ) : (
                          <p className="muted mt-2 text-xs">Final stage</p>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {rejectTarget && (
        <RejectModal
          name={rejectTarget.name}
          onClose={() => setRejecting(null)}
          onConfirm={async (rejectionReason, rejectionNote) => {
            await move(rejectTarget._id, 'Rejected', { rejectionReason, rejectionNote });
            setRejecting(null);
          }}
        />
      )}
    </>
  );
}
