import { FLOW } from '../lib/constants.js';

/** Visual progress through the pipeline: done (green), current (blue), upcoming (grey). */
export default function StageStepper({ stage, history = [] }) {
  const reached = new Set(history.map((h) => h.stage));
  reached.add(stage);
  const rejected = stage === 'Rejected';
  const finished = stage === 'Hired';
  const cur = FLOW.indexOf(stage);

  return (
    <ol className="flex min-w-max items-start" aria-label="Pipeline progress">
      {FLOW.map((s, i) => {
        const done = rejected ? reached.has(s) : finished || i < cur;
        const current = !rejected && !finished && i === cur;
        const lineDone = rejected ? reached.has(FLOW[i + 1]) : finished || i < cur;
        return (
          <li key={s} className="flex items-start">
            <div className="flex w-24 flex-col items-center gap-1.5 text-center">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  current
                    ? 'bg-brand-600 text-white ring-4 ring-brand-200 dark:ring-brand-700/40'
                    : done
                      ? 'bg-emerald-500 text-white'
                      : 'bg-stone-200 text-stone-500 dark:bg-stone-800 dark:text-stone-400'
                }`}
              >
                {done ? '✓' : i + 1}
              </span>
              <span className={`text-[11px] font-semibold leading-tight ${current ? 'text-brand-700 dark:text-brand-200' : done ? '' : 'muted'}`}>{s}</span>
            </div>
            {i < FLOW.length - 1 && <span className={`mt-4 h-0.5 w-6 shrink-0 sm:w-8 ${lineDone ? 'bg-emerald-500' : 'bg-stone-200 dark:bg-stone-800'}`} />}
          </li>
        );
      })}
      {rejected && (
        <li className="flex items-start">
          <span className="mt-4 h-0.5 w-6 shrink-0 bg-rose-400 sm:w-8" />
          <div className="flex w-24 flex-col items-center gap-1.5 text-center">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white">✕</span>
            <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">Rejected</span>
          </div>
        </li>
      )}
    </ol>
  );
}
