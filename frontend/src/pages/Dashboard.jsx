import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useFetch } from '../lib/useFetch.js';
import { useCountUp } from '../lib/useCountUp.js';
import { useAuth } from '../store/auth.js';
import { STAGE_STYLES, INTERVIEW_TYPES, REJECTION_REASONS, labelOf } from '../lib/constants.js';
import { fmtDateTime, timeAgo } from '../lib/format.js';
import { EmptyState, ErrorBanner, Skeleton, StageBadge } from '../components/ui.jsx';

function Stat({ label, value, hint, accent }) {
  const shown = useCountUp(value);
  return (
    <div className={`card card-hover border-l-4 p-4 ${accent}`}>
      <p className="muted">{label}</p>
      <p className="mt-1 font-display text-4xl font-bold tabular-nums">{shown}</p>
      {hint && <p className="muted mt-0.5 text-xs">{hint}</p>}
    </div>
  );
}

function Card({ title, action, children, className = '' }) {
  return (
    <section className={`card ${className}`}>
      <div className="flex items-center justify-between px-5 pt-5">
        <h2 className="text-lg font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Funnel({ funnel }) {
  const top = Math.max(1, funnel[0]?.count || 1);
  return (
    <div className="space-y-2 px-5 pb-5 pt-4">
      {funnel.map((f) => (
        <div key={f.stage} className="grid grid-cols-[7.5rem_1fr_3.5rem] items-center gap-3 text-sm">
          <span className="truncate">{f.stage}</span>
          <div className="flex justify-center">
            <div
              className={`flex h-8 items-center justify-center rounded-md text-xs font-bold text-white transition-all duration-700 ${STAGE_STYLES[f.stage].bar}`}
              style={{ width: `${Math.max(12, (f.count / top) * 100)}%` }}
            >
              {f.count}
            </div>
          </div>
          <span className="muted text-right text-xs tabular-nums">{f.ofPrevious == null ? '' : `${f.ofPrevious}%`}</span>
        </div>
      ))}
      <p className="muted pt-1 text-xs">Bars show how many candidates ever reached each stage. The percentage is how many made it from the stage before.</p>
    </div>
  );
}

function Donut({ segments }) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  const r = 52;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex flex-col items-center gap-4 px-5 pb-5 pt-4">
      <div className="relative h-44 w-44">
        <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90" role="img" aria-label="Candidate outcome split">
          <circle cx="70" cy="70" r={r} fill="none" strokeWidth="16" className="stroke-stone-100 dark:stroke-stone-800" />
          {segments.map((s) => {
            const len = total ? (s.value / total) * c : 0;
            const el = (
              <circle key={s.label} cx="70" cy="70" r={r} fill="none" strokeWidth="16" stroke={s.color}
                strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} className="transition-all duration-700" />
            );
            offset += len;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-3xl font-bold">{total}</span>
          <span className="muted text-xs">candidates</span>
        </div>
      </div>
      <ul className="w-full space-y-1.5 text-sm">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center justify-between">
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />{s.label}</span>
            <span className="font-semibold tabular-nums">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function WeekStrip({ items }) {
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, k) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + k); return d; }),
    []
  );
  const byDay = {};
  items.forEach((i) => { (byDay[new Date(i.scheduledAt).toDateString()] ||= []).push(i); });
  const [sel, setSel] = useState((days.find((d) => byDay[d.toDateString()]) || days[0]).toDateString());
  const list = byDay[sel] || [];

  return (
    <div className="px-5 pb-5 pt-4">
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {days.map((d, k) => {
          const n = (byDay[d.toDateString()] || []).length;
          const active = sel === d.toDateString();
          return (
            <button
              key={d.toDateString()}
              onClick={() => setSel(d.toDateString())}
              className={`rounded-lg border p-2 text-center transition-colors ${active ? 'border-brand-500 bg-brand-50 dark:bg-brand-700/20' : 'border-stone-200 hover:bg-stone-50 dark:border-stone-800 dark:hover:bg-stone-800/50'}`}
              aria-label={`${d.toDateString()}: ${n} interviews`}
            >
              <span className="muted block text-xs">{k === 0 ? 'Today' : d.toLocaleDateString(undefined, { weekday: 'short' })}</span>
              <span className="block font-display text-xl font-bold">{d.getDate()}</span>
              <span className="mt-1 flex h-2 justify-center gap-0.5">
                {Array.from({ length: Math.min(n, 4) }, (_, j) => <span key={j} className="h-1.5 w-1.5 rounded-full bg-brand-500" />)}
              </span>
            </button>
          );
        })}
      </div>
      {list.length === 0 ? (
        <p className="muted mt-4">No interviews on this day.</p>
      ) : (
        <ul className="mt-4 divide-y divide-stone-100 dark:divide-stone-800">
          {list.map((i) => (
            <li key={i._id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <div className="min-w-0">
                <Link to={`/candidates/${i.candidate._id}`} className="block truncate font-semibold hover:underline">{i.candidate.name}</Link>
                <p className="muted truncate text-xs">{labelOf(INTERVIEW_TYPES, i.type)} with {i.interviewer.name}</p>
              </div>
              <span className="shrink-0 font-medium">{new Date(i.scheduledAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BarList({ rows, barClass, empty }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.every((r) => r.value == null)) return <p className="muted px-5 pb-5 pt-4">{empty}</p>;
  return (
    <div className="space-y-3 px-5 pb-5 pt-4">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[8rem_1fr_3.5rem] items-center gap-3 text-sm">
          <span className="truncate">{r.label}</span>
          <div className="h-2.5 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
            <div className={`h-full rounded-full transition-all duration-700 ${r.bar || barClass}`} style={{ width: `${((r.value || 0) / max) * 100}%` }} />
          </div>
          <span className="text-right font-semibold tabular-nums">{r.value == null ? '-' : r.suffix ? `${r.value}${r.suffix}` : r.value}</span>
        </div>
      ))}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading dashboard">
      <Skeleton className="h-40 rounded-xl" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-72 rounded-lg lg:col-span-2" />
        <Skeleton className="h-72 rounded-lg" />
      </div>
    </div>
  );
}

/** Shown to recruiters until their first candidate exists. */
function Onboarding() {
  const steps = [
    { n: 1, title: 'Add your first candidate', text: 'Enter their details or paste a resume link.', to: '/candidates', cta: 'Add candidate' },
    { n: 2, title: 'Invite your interviewers', text: 'Ask them to sign up as interviewers on the signup page.', to: null },
    { n: 3, title: 'Schedule an interview', text: 'Pick a candidate, an interviewer and a time.', to: '/interviews', cta: 'Schedule' },
  ];
  return (
    <section className="card border-brand-200 bg-brand-50/60 p-5 dark:border-brand-700/40 dark:bg-brand-700/10">
      <h2 className="text-lg font-bold">Get started in three steps</h2>
      <ol className="mt-4 grid gap-4 md:grid-cols-3">
        {steps.map((s) => (
          <li key={s.n} className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">{s.n}</span>
            <div>
              <p className="font-semibold">{s.title}</p>
              <p className="muted">{s.text}</p>
              {s.to && <Link to={s.to} className="mt-1 inline-block text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400">{s.cta}</Link>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function Dashboard() {
  const user = useAuth((s) => s.user);
  const { data, loading, error, reload } = useFetch(() => api.get('/dashboard'), []);

  if (loading) return <DashboardSkeleton />;
  if (error) return <ErrorBanner message={error} onRetry={reload} />;
  const d = data.data;
  const isRecruiter = d.role === 'recruiter';
  const first = user.name.split(' ')[0];

  return (
    <div className="stagger space-y-6">
      <section
        className="relative overflow-hidden rounded-xl bg-stone-950 p-6 text-white sm:p-8"
        style={{ backgroundImage: 'radial-gradient(520px circle at 88% 0%, rgba(47,102,232,0.38), transparent 70%)' }}
      >
        <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-12 hidden h-60 w-60 animate-float rounded-full border border-white/10 sm:block" />
        <div aria-hidden="true" className="pointer-events-none absolute right-28 top-28 hidden h-20 w-20 animate-float rounded-full border border-brand-400/30 sm:block" style={{ animationDelay: '-3s' }} />
        <p className="text-sm text-stone-400">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <h1 className="mt-1 text-3xl font-bold !text-white sm:text-4xl">Hello, {first}</h1>
        <p className="mt-2 max-w-xl text-stone-300">
          {isRecruiter
            ? `${d.totals.inProgress} candidates are in progress, ${d.weekInterviews.length} interviews are coming up this week and ${d.totals.hired} have been hired so far.`
            : `You have ${d.weekInterviews.length} interviews this week across ${d.totals.candidates} assigned candidates.`}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {isRecruiter && <Link to="/pipeline" className="btn bg-white text-stone-900 hover:bg-stone-200">Open pipeline board</Link>}
          <Link to={isRecruiter ? '/candidates' : '/interviews'} className="btn border border-white/30 text-white hover:bg-white/10">
            {isRecruiter ? 'View candidates' : 'View my interviews'}
          </Link>
        </div>
      </section>

      {isRecruiter && d.totals.candidates === 0 && <Onboarding />}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label={isRecruiter ? 'Total candidates' : 'Assigned candidates'} value={d.totals.candidates} accent="border-l-brand-500" />
        <Stat label="In progress" value={d.totals.inProgress} accent="border-l-sky-500" />
        {isRecruiter ? (
          <>
            <Stat label="Hired" value={d.totals.hired} accent="border-l-emerald-500" />
            <Stat label="Rejected" value={d.totals.rejected} accent="border-l-rose-500" />
          </>
        ) : (
          <>
            <Stat label="Without feedback" value={d.interviewerStats.pendingFeedback} hint="Past interviews. Feedback is optional." accent="border-l-amber-500" />
            <Stat label="Feedback shared" value={d.interviewerStats.feedbackSubmitted} accent="border-l-emerald-500" />
          </>
        )}
      </div>

      {isRecruiter && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card title="Hiring funnel" className="lg:col-span-2"><Funnel funnel={d.funnel} /></Card>
          <Card title="Outcomes">
            <Donut
              segments={[
                { label: 'In progress', value: d.totals.inProgress, color: '#2f66e8' },
                { label: 'Hired', value: d.totals.hired, color: '#10b981' },
                { label: 'Rejected', value: d.totals.rejected, color: '#f43f5e' },
              ]}
            />
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Interviews this week" className="lg:col-span-2"><WeekStrip items={d.weekInterviews} /></Card>
        <Card title="Up next" action={<Link to="/interviews" className="text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400">All</Link>}>
          {d.upcomingInterviews.length === 0 ? (
            <EmptyState title="Nothing scheduled" hint="Upcoming interviews will show up here." />
          ) : (
            <ul className="mt-2 divide-y divide-stone-100 dark:divide-stone-800">
              {d.upcomingInterviews.slice(0, 5).map((i) => (
                <li key={i._id} className="px-5 py-3 text-sm">
                  <Link to={`/candidates/${i.candidate._id}`} className="block truncate font-semibold hover:underline">{i.candidate.name}</Link>
                  <p className="muted text-xs">{fmtDateTime(i.scheduledAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {isRecruiter && (
        <>
          <div className="grid gap-6 lg:grid-cols-3">
            <Card title="Average days in each stage" className="lg:col-span-2">
              <BarList
                rows={d.stageDurations.map((s) => ({ label: s.stage, value: s.avgDays, suffix: 'd', bar: STAGE_STYLES[s.stage].bar }))}
                empty="Move a few candidates through the pipeline to see how long each stage takes."
              />
            </Card>
            <Card title={`Waiting over ${d.stuckThresholdDays} days`}>
              {d.stuck.length === 0 ? (
                <p className="muted px-5 pb-5 pt-4">Nobody is stuck. Nice.</p>
              ) : (
                <ul className="mt-2 divide-y divide-stone-100 dark:divide-stone-800">
                  {d.stuck.map((c) => (
                    <li key={c._id} className="flex items-center justify-between gap-2 px-5 py-3 text-sm">
                      <div className="min-w-0">
                        <Link to={`/candidates/${c._id}`} className="block truncate font-semibold hover:underline">{c.name}</Link>
                        <StageBadge stage={c.stage} />
                      </div>
                      <span className="shrink-0 font-display text-lg font-bold text-amber-600 dark:text-amber-400">{c.days}d</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card title="Why candidates are rejected">
              <BarList
                rows={d.rejectionReasons.map((r) => ({ label: labelOf(REJECTION_REASONS, r.reason), value: r.count }))}
                barClass="bg-rose-500"
                empty="No rejections yet."
              />
            </Card>
            <Card title="Recruiter activity, last 30 days" className="overflow-hidden">
              {d.activitySummary.length === 0 ? (
                <EmptyState title="No activity yet" />
              ) : (
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-stone-100 dark:border-stone-800">
                        <th className="th">Recruiter</th><th className="th">Added</th><th className="th">Moves</th><th className="th">Interviews</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.activitySummary.map((r) => (
                        <tr key={r.userId} className="border-b border-stone-100 last:border-0 dark:border-stone-800">
                          <td className="td font-semibold">{r.name}</td>
                          <td className="td tabular-nums">{r.candidatesAdded}</td>
                          <td className="td tabular-nums">{r.stageChanges}</td>
                          <td className="td tabular-nums">{r.interviewsScheduled}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
            <Card title="Recent activity" action={<Link to="/activity" className="text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400">Full log</Link>}>
              <ul className="mt-2 divide-y divide-stone-100 dark:divide-stone-800">
                {d.recentActivity.map((a) => (
                  <li key={a._id} className="px-5 py-2.5 text-sm">
                    <p>{a.message}</p>
                    <p className="muted text-xs">{timeAgo(a.createdAt)}</p>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
