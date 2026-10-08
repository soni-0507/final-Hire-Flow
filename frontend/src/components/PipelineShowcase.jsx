import { useEffect, useRef, useState } from 'react';
import { STAGE_STYLES } from '../lib/constants.js';

const PATH = ['Applied', 'Screening', 'Technical Interview', 'HR Interview', 'Offered', 'Hired'];

const PEOPLE = [
  { name: 'Aarav Mehta', role: 'Frontend Engineer', start: 1 },
  { name: 'Diya Nair', role: 'Backend Engineer', start: 2 },
  { name: 'Meera Iyer', role: 'Product Designer', start: 4 },
  { name: 'Kabir Singh', role: 'Full Stack Developer', start: 0 },
];

/** A small live pipeline: candidates advance on their own, and every bar is clickable. */
export default function PipelineShowcase() {
  const [pos, setPos] = useState(PEOPLE.map((p) => p.start));
  const [last, setLast] = useState(null);
  const [paused, setPaused] = useState(false);
  const tick = useRef(0);
  const reduceMotion = useRef(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    if (paused || reduceMotion.current) return undefined;
    const id = setInterval(() => {
      const who = tick.current++ % PEOPLE.length;
      setLast(who);
      setPos((prev) => prev.map((v, i) => (i === who ? (v >= PATH.length - 1 ? 0 : v + 1) : v)));
    }, 2200);
    return () => clearInterval(id);
  }, [paused]);

  const move = (who, stage) => {
    setLast(who);
    setPos((prev) => prev.map((v, i) => (i === who ? stage : v)));
  };
  const hired = pos.filter((p) => p === PATH.length - 1).length;

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} className="space-y-3">
      {PEOPLE.map((person, i) => {
        const stage = PATH[pos[i]];
        return (
          <div
            key={person.name}
            className={`rounded-lg bg-white/5 p-3.5 ring-1 transition-all duration-500 ${last === i ? 'translate-x-1 ring-brand-400' : 'ring-white/10'}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{person.name}</p>
                <p className="truncate text-xs text-stone-400">{person.role}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STAGE_STYLES[stage].badge}`}>{stage}</span>
            </div>
            <div className="mt-2.5 flex gap-1.5">
              {PATH.map((s, si) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => move(i, si)}
                  aria-label={`Move ${person.name} to ${s}`}
                  title={s}
                  className="group h-5 flex-1 focus-visible:outline-brand-400"
                >
                  <span
                    className={`block h-2 rounded-full transition-all duration-500 group-hover:h-3 ${si <= pos[i] ? STAGE_STYLES[stage].bar : 'bg-white/10 group-hover:bg-white/25'}`}
                  />
                </button>
              ))}
            </div>
          </div>
        );
      })}
      <p className="pt-1 text-xs text-stone-500" aria-live="polite">
        {hired} of {PEOPLE.length} hired{paused ? ' · paused while you explore' : ''}
      </p>
    </div>
  );
}
