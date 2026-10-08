import Feedback from '../models/Feedback.js';
import Interview from '../models/Interview.js';
import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { pageMeta } from '../utils/helpers.js';
import { logActivity } from '../services/activity.js';
import { sendMail } from '../services/mailer.js';
import { recomputeScore } from '../services/score.js';
import { ROLES } from '../constants.js';

const POPULATE = [
  { path: 'candidate', select: 'name position stage' },
  { path: 'interviewer', select: 'name email' },
  { path: 'interview', select: 'type scheduledAt status' },
];

export const listFeedback = asyncHandler(async (req, res) => {
  const { candidate, interview, page, limit } = req.query;
  const filter = {};
  if (req.user.role === ROLES.INTERVIEWER) filter.interviewer = req.user._id;
  if (candidate) filter.candidate = candidate;
  if (interview) filter.interview = interview;

  const [data, total] = await Promise.all([
    Feedback.find(filter)
      .populate(POPULATE)
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit),
    Feedback.countDocuments(filter),
  ]);
  res.json({ data, meta: pageMeta(total, page, limit) });
});

export const getFeedback = asyncHandler(async (req, res) => {
  const fb = await Feedback.findById(req.params.id).populate(POPULATE);
  if (!fb) throw new AppError('Feedback not found', 404);
  if (req.user.role === ROLES.INTERVIEWER && String(fb.interviewer._id) !== String(req.user._id)) {
    throw new AppError('You can only view your own feedback', 403);
  }
  res.json({ data: fb });
});

export const createFeedback = asyncHandler(async (req, res) => {
  const interview = await Interview.findById(req.body.interview).populate('candidate', 'name');
  if (!interview) throw new AppError('Interview not found', 404);
  if (String(interview.interviewer) !== String(req.user._id)) {
    throw new AppError('You can only submit feedback for your own interviews', 403);
  }
  if (interview.status === 'cancelled') throw new AppError('Cannot submit feedback for a cancelled interview', 422);

  const fb = await Feedback.create({
    ...req.body,
    candidate: interview.candidate._id,
    interviewer: req.user._id,
  });
  interview.status = 'completed';
  await interview.save();
  await recomputeScore(interview.candidate._id);

  await logActivity({
    actor: req.user,
    action: 'feedback.submitted',
    message: `${req.user.name} submitted feedback for ${interview.candidate.name} (${fb.rating}/5, ${fb.recommendation.replace('_', ' ')})`,
    candidate: interview.candidate._id,
    entityType: 'Feedback',
    entityId: fb._id,
  });

  const recruiters = await User.find({ role: ROLES.RECRUITER }).select('email');
  await Promise.all(
    recruiters.map((r) =>
      sendMail({
        to: r.email,
        subject: `Feedback received: ${interview.candidate.name}`,
        body: `${req.user.name} rated ${interview.candidate.name} ${fb.rating}/5 (${fb.recommendation.replace('_', ' ')}).`,
        kind: 'feedback_submitted',
      })
    )
  );
  await fb.populate(POPULATE);
  res.status(201).json({ data: fb });
});

export const updateFeedback = asyncHandler(async (req, res) => {
  const fb = await Feedback.findById(req.params.id);
  if (!fb) throw new AppError('Feedback not found', 404);
  if (String(fb.interviewer) !== String(req.user._id)) throw new AppError('You can only edit your own feedback', 403);
  fb.set(req.body);
  await fb.save();
  await recomputeScore(fb.candidate);
  await fb.populate(POPULATE);
  res.json({ data: fb });
});

export const deleteFeedback = asyncHandler(async (req, res) => {
  const fb = await Feedback.findById(req.params.id);
  if (!fb) throw new AppError('Feedback not found', 404);
  const isAuthor = String(fb.interviewer) === String(req.user._id);
  if (!isAuthor && req.user.role !== ROLES.RECRUITER) throw new AppError('You can only delete your own feedback', 403);
  await fb.deleteOne();
  await recomputeScore(fb.candidate);
  res.status(204).end();
});
