export const STAGES = [
  'Applied',
  'Screening',
  'Technical Interview',
  'HR Interview',
  'Offered',
  'Rejected',
  'Hired',
];

// Full class names so Tailwind can detect them.
export const STAGE_STYLES = {
  Applied: { badge: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300', bar: 'bg-stone-400', rail: 'border-t-stone-400' },
  Screening: { badge: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300', bar: 'bg-sky-500', rail: 'border-t-sky-500' },
  'Technical Interview': { badge: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300', bar: 'bg-violet-500', rail: 'border-t-violet-500' },
  'HR Interview': { badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300', bar: 'bg-amber-500', rail: 'border-t-amber-500' },
  Offered: { badge: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300', bar: 'bg-teal-500', rail: 'border-t-teal-500' },
  Rejected: { badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300', bar: 'bg-rose-500', rail: 'border-t-rose-500' },
  Hired: { badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300', bar: 'bg-emerald-500', rail: 'border-t-emerald-500' },
};

export const INTERVIEW_TYPES = [
  { value: 'screening', label: 'Screening' },
  { value: 'technical', label: 'Technical' },
  { value: 'hr', label: 'HR' },
];
export const INTERVIEW_MODES = [
  { value: 'video', label: 'Video call' },
  { value: 'phone', label: 'Phone' },
  { value: 'onsite', label: 'On-site' },
];
export const RECOMMENDATIONS = [
  { value: 'strong_hire', label: 'Strong hire' },
  { value: 'hire', label: 'Hire' },
  { value: 'no_hire', label: 'No hire' },
  { value: 'strong_no_hire', label: 'Strong no hire' },
];
export const RECOMMENDATION_STYLES = {
  strong_hire: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  hire: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300',
  no_hire: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  strong_no_hire: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
};
export const labelOf = (list, value) => list.find((o) => o.value === value)?.label || value;

// ---- pipeline rules (mirrors the server) ----
export const FLOW = ['Applied', 'Screening', 'Technical Interview', 'HR Interview', 'Offered', 'Hired'];
export const BOARD_ORDER = [...FLOW, 'Rejected'];

export const REJECTION_REASONS = [
  { value: 'skills_gap', label: 'Skills gap' },
  { value: 'salary_mismatch', label: 'Salary mismatch' },
  { value: 'culture_fit', label: 'Culture fit' },
  { value: 'withdrew', label: 'Candidate withdrew' },
  { value: 'position_filled', label: 'Position filled' },
  { value: 'other', label: 'Other' },
];

/** Stages a candidate may move to: the next step, or Rejected. Hired / Rejected are final. */
export function nextStages(current) {
  if (current === 'Hired' || current === 'Rejected') return [];
  const i = FLOW.indexOf(current);
  return i === -1 ? [] : [FLOW[i + 1], 'Rejected'];
}

export function transitionError(from, to) {
  if (from === to) return null;
  if (from === 'Hired' || from === 'Rejected') return `${from} candidates are locked and cannot change stage`;
  if (to === 'Rejected') return null;
  const i = FLOW.indexOf(from);
  const j = FLOW.indexOf(to);
  if (j < i) return `Cannot move backwards from ${from} to ${to}`;
  if (j > i + 1) return `Cannot skip stages. The next step after ${from} is ${FLOW[i + 1]}`;
  return null;
}
