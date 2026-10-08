import Interview from '../models/Interview.js';
import Candidate from '../models/Candidate.js';
import Feedback from '../models/Feedback.js';
import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { pageMeta } from '../utils/helpers.js';
import { logActivity } from '../services/activity.js';
import { sendMail } from '../services/mailer.js';
import { recomputeScore } from '../services/score.js';
import { ROLES } from '../constants.js';

const POPULATE = [
  { path: 'candidate', select: 'name email position stage' },
  { path: 'interviewer', select: 'name email' },
];

const fmt = (d) => new Date(d).toUTCString();

/** Reject if the interviewer already has an overlapping scheduled interview. */
async function assertNoConflict({ interviewer, scheduledAt, durationMins, excludeId }) {
  const start = new Date(scheduledAt);
  const end = new Date(start.getTime() + durationMins * 60000);
  const nearby = await Interview.find({
    interviewer,
    status: 'scheduled',
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    scheduledAt: { $gte: new Date(start.getTime() - 8 * 3600000), $lte: end },
  });
  const clash = nearby.find((i) => {
    const iEnd = new Date(i.scheduledAt.getTime() + i.durationMins * 60000);
    return i.scheduledAt < end && iEnd > start;
  });
  if (clash) throw new AppError('This interviewer already has an interview during that time', 409);
}

async function attachFeedbackFlags(interviews) {
  const ids = interviews.map((i) => i._id);
  const feedback = await Feedback.find({ interview: { $in: ids } }).select('interview');
  const map = new Map(feedback.map((f) => [String(f.interview), f._id]));
  return interviews.map((i) => ({ ...i.toJSON(), feedbackId: map.get(String(i._id)) || null }));
}

export const listInterviews = asyncHandler(async (req, res) => {
  const { when, status, candidate, interviewer, from, to, page, limit } = req.query;
  const filter = {};
  if (req.user.role === ROLES.INTERVIEWER) filter.interviewer = req.user._id;
  else if (interviewer) filter.interviewer = interviewer;
  if (candidate) filter.candidate = candidate;
  if (status) filter.status = status;
  if (from || to) filter.scheduledAt = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };

  let sort = '-scheduledAt';
  if (when === 'upcoming') {
    filter.status = 'scheduled';
    filter.scheduledAt = { ...(filter.scheduledAt || {}), $gte: new Date() };
    sort = 'scheduledAt';
  } else if (when === 'past') {
    filter.$or = [{ scheduledAt: { $lt: new Date() } }, { status: { $ne: 'scheduled' } }];
  }

  const [rows, total] = await Promise.all([
    Interview.find(filter)
      .populate(POPULATE)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit),
    Interview.countDocuments(filter),
  ]);
  res.json({ data: await attachFeedbackFlags(rows), meta: pageMeta(total, page, limit) });
});

export const getInterview = asyncHandler(async (req, res) => {
  const interview = await Interview.findById(req.params.id).populate(POPULATE);
  if (!interview) throw new AppError('Interview not found', 404);
  if (req.user.role === ROLES.INTERVIEWER && String(interview.interviewer._id) !== String(req.user._id)) {
    throw new AppError('This interview is not assigned to you', 403);
  }
  const [data] = await attachFeedbackFlags([interview]);
  res.json({ data });
});

export const createInterview = asyncHandler(async (req, res) => {
  const { candidate: candidateId, interviewer: interviewerId } = req.body;
  const [candidate, interviewer] = await Promise.all([
    Candidate.findById(candidateId),
    User.findById(interviewerId),
  ]);
  if (!candidate) throw new AppError('Candidate not found', 404);
  if (!interviewer || interviewer.role !== ROLES.INTERVIEWER) {
    throw new AppError('Selected user is not an interviewer', 422);
  }
  await assertNoConflict(req.body);

  const interview = await Interview.create({ ...req.body, scheduledBy: req.user._id });
  await interview.populate(POPULATE);

  await logActivity({
    actor: req.user,
    action: 'interview.scheduled',
    message: `${req.user.name} scheduled a ${interview.type} interview for ${candidate.name} with ${interviewer.name}`,
    candidate: candidate._id,
    entityType: 'Interview',
    entityId: interview._id,
  });
  await Promise.all([
    sendMail({
      to: candidate.email,
      subject: `Interview scheduled: ${interview.type}`,
      body: `Hi ${candidate.name}, your ${interview.type} interview is scheduled for ${fmt(interview.scheduledAt)} (${interview.durationMins} min, ${interview.mode}).`,
      kind: 'interview_scheduled',
    }),
    sendMail({
      to: interviewer.email,
      subject: `New interview assigned: ${candidate.name}`,
      body: `Hi ${interviewer.name}, you are interviewing ${candidate.name} for ${candidate.position} on ${fmt(interview.scheduledAt)}.`,
      kind: 'interview_assigned',
    }),
  ]);
  res.status(201).json({ data: interview });
});

export const updateInterview = asyncHandler(async (req, res) => {
  const interview = await Interview.findById(req.params.id);
  if (!interview) throw new AppError('Interview not found', 404);

  const next = { ...interview.toObject(), ...req.body };
  if (next.status === 'scheduled' && (req.body.scheduledAt || req.body.interviewer || req.body.durationMins)) {
    await assertNoConflict({
      interviewer: next.interviewer,
      scheduledAt: next.scheduledAt,
      durationMins: next.durationMins,
      excludeId: interview._id,
    });
  }
  if (req.body.interviewer) {
    const u = await User.findById(req.body.interviewer);
    if (!u || u.role !== ROLES.INTERVIEWER) throw new AppError('Selected user is not an interviewer', 422);
  }

  interview.set(req.body);
  await interview.save();
  await interview.populate(POPULATE);

  const cancelled = req.body.status === 'cancelled';
  await logActivity({
    actor: req.user,
    action: cancelled ? 'interview.cancelled' : 'interview.updated',
    message: `${req.user.name} ${cancelled ? 'cancelled' : 'updated'} the ${interview.type} interview for ${interview.candidate.name}`,
    candidate: interview.candidate._id,
    entityType: 'Interview',
    entityId: interview._id,
  });
  if (cancelled || req.body.scheduledAt) {
    await sendMail({
      to: interview.candidate.email,
      subject: cancelled ? 'Interview cancelled' : 'Interview rescheduled',
      body: cancelled
        ? `Hi ${interview.candidate.name}, your interview has been cancelled. We will contact you with next steps.`
        : `Hi ${interview.candidate.name}, your interview is now scheduled for ${fmt(interview.scheduledAt)}.`,
      kind: cancelled ? 'interview_cancelled' : 'interview_rescheduled',
    });
  }
  res.json({ data: interview });
});

export const deleteInterview = asyncHandler(async (req, res) => {
  const interview = await Interview.findByIdAndDelete(req.params.id);
  if (!interview) throw new AppError('Interview not found', 404);
  await Feedback.deleteMany({ interview: interview._id });
  await recomputeScore(interview.candidate);
  await logActivity({
    actor: req.user,
    action: 'interview.deleted',
    message: `${req.user.name} deleted an interview`,
    candidate: interview.candidate,
    entityType: 'Interview',
  });
  res.status(204).end();
});
