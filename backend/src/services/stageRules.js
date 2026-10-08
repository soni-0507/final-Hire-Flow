import { FLOW } from '../constants.js';

/** Stages a candidate may move to from `current`. Hired and Rejected are final. */
export function allowedNextStages(current) {
  if (current === 'Hired' || current === 'Rejected') return [];
  const i = FLOW.indexOf(current);
  return i === -1 ? [] : [FLOW[i + 1], 'Rejected'];
}

/** Pure rule check. Interviews and feedback are NOT required to advance. */
export function validateTransition(from, to) {
  if (from === to) return { ok: true, noop: true };
  if (from === 'Hired' || from === 'Rejected') {
    return { ok: false, message: `${from} candidates are locked and cannot change stage` };
  }
  if (to === 'Rejected') return { ok: true };
  const i = FLOW.indexOf(from);
  const j = FLOW.indexOf(to);
  if (j < i) return { ok: false, message: `Cannot move backwards from ${from} to ${to}` };
  if (j > i + 1) return { ok: false, message: `Cannot skip stages. The next step after ${from} is ${FLOW[i + 1]}` };
  return { ok: true };
}
