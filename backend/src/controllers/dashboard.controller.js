import Candidate from '../models/Candidate.js';
import Interview from '../models/Interview.js';
import Feedback from '../models/Feedback.js';
import ActivityLog from '../models/ActivityLog.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { assignedCandidateIds } from '../services/access.js';
import { ROLES, STAGES, FLOW } from '../constants.js';

const DAY = 86400000;
const STUCK_DAYS = 7;
const isActive = (s) => s !== 'Hired' && s !== 'Rejected';
const round1 = (n) => Math.round(n * 10) / 10;

export const summary = asyncHandler(async (req, res) => {
  const isRecruiter = req.user.role === ROLES.RECRUITER;
  const now = new Date();
  const candidateFilter = isRecruiter ? {} : { _id: { $in: await assignedCandidateIds(req.user) } };
  const interviewFilter = isRecruiter ? {} : { interviewer: req.user._id };

  const [cands, upcoming, week] = await Promise.all([
    Candidate.find(candidateFilter).select('name position stage stageHistory rejectionReason createdAt'),
    Interview.find({ ...interviewFilter, status: 'scheduled', scheduledAt: { $gte: now } })
      .populate('candidate', 'name position stage')
      .populate('interviewer', 'name')
      .sort('scheduledAt')
      .limit(6),
    Interview.find({ ...interviewFilter, status: 'scheduled', scheduledAt: { $gte: now, $lte: new Date(now.getTime() + 7 * DAY) } })
      .populate('candidate', 'name position')
      .populate('interviewer', 'name')
      .sort('scheduledAt')
      .limit(60),
  ]);

  const counts = Object.fromEntries(STAGES.map((s) => [s, 0]));
  cands.forEach((c) => (counts[c.stage] += 1));
  const total = cands.length;

  const data = {
    role: req.user.role,
    totals: { candidates: total, inProgress: total - counts.Rejected - counts.Hired, hired: counts.Hired, rejected: counts.Rejected },
    stageCounts: STAGES.map((stage) => ({ stage, count: counts[stage] })),
    upcomingInterviews: upcoming,
    weekInterviews: week,
  };

  if (isRecruiter) {
    // ---- funnel: how many candidates ever reached each stage ----
    const reached = (c, stage) => {
      const cur = FLOW.indexOf(c.stage);
      return c.stageHistory.some((h) => h.stage === stage) || (cur !== -1 && cur >= FLOW.indexOf(stage));
    };
    data.funnel = FLOW.map((stage, i, arr) => {
      const count = cands.filter((c) => reached(c, stage)).length;
      return { stage, count, ofPrevious: i === 0 ? null : arr[i - 1] && Math.round((count / Math.max(1, cands.filter((c) => reached(c, arr[i - 1])).length)) * 100) };
    });

    // ---- average days spent in each stage (completed stays only) ----
    const acc = {};
    for (const c of cands) {
      const h = [...c.stageHistory].sort((a, b) => a.changedAt - b.changedAt);
      for (let k = 0; k < h.length - 1; k++) {
        acc[h[k].stage] ||= { sum: 0, n: 0 };
        acc[h[k].stage].sum += h[k + 1].changedAt - h[k].changedAt;
        acc[h[k].stage].n += 1;
      }
    }
    data.stageDurations = FLOW.filter((s) => s !== 'Hired').map((stage) => ({
      stage,
      avgDays: acc[stage] ? round1(acc[stage].sum / acc[stage].n / DAY) : null,
      samples: acc[stage]?.n || 0,
    }));

    // ---- bottlenecks: active candidates waiting too long in their current stage ----
    data.stuckThresholdDays = STUCK_DAYS;
    data.stuck = cands
      .filter((c) => isActive(c.stage))
      .map((c) => {
        const since = c.stageHistory.length ? c.stageHistory[c.stageHistory.length - 1].changedAt : c.createdAt;
        return { _id: c._id, name: c.name, position: c.position, stage: c.stage, days: Math.floor((now - since) / DAY) };
      })
      .filter((c) => c.days > STUCK_DAYS)
      .sort((a, b) => b.days - a.days)
      .slice(0, 5);

    // ---- why candidates are rejected ----
    const reasons = {};
    cands.filter((c) => c.stage === 'Rejected').forEach((c) => {
      const r = c.rejectionReason || 'other';
      reasons[r] = (reasons[r] || 0) + 1;
    });
    data.rejectionReasons = Object.entries(reasons).map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count);

    const since = new Date(now.getTime() - 30 * DAY);
    const count = (action) => ({ $sum: { $cond: [{ $eq: ['$action', action] }, 1, 0] } });
    const [activitySummary, recentActivity] = await Promise.all([
      ActivityLog.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: '$actor',
            total: { $sum: 1 },
            candidatesAdded: count('candidate.created'),
            stageChanges: count('candidate.stage_changed'),
            interviewsScheduled: count('interview.scheduled'),
            notesAdded: count('note.added'),
          },
        },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        { $match: { 'user.role': ROLES.RECRUITER } },
        { $project: { _id: 0, userId: '$_id', name: '$user.name', total: 1, candidatesAdded: 1, stageChanges: 1, interviewsScheduled: 1, notesAdded: 1 } },
        { $sort: { total: -1 } },
      ]),
      ActivityLog.find().populate('actor', 'name role').sort('-createdAt').limit(8),
    ]);
    data.activitySummary = activitySummary;
    data.recentActivity = recentActivity;
  } else {
    // feedback is optional: this just tells the interviewer which past interviews have none yet
    const mine = await Interview.find({ interviewer: req.user._id, status: { $ne: 'cancelled' }, scheduledAt: { $lt: now } }).select('_id');
    const given = await Feedback.find({ interviewer: req.user._id }).select('interview');
    const done = new Set(given.map((f) => String(f.interview)));
    data.interviewerStats = {
      pendingFeedback: mine.filter((i) => !done.has(String(i._id))).length,
      feedbackSubmitted: given.length,
    };
  }

  res.json({ data });
});
