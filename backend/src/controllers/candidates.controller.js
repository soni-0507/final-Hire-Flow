import fs from 'fs';
import path from 'path';
import Candidate from '../models/Candidate.js';
import Interview from '../models/Interview.js';
import Feedback from '../models/Feedback.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { escapeRegex, pageMeta } from '../utils/helpers.js';
import { csvCell } from '../utils/csv.js';
import { assertCandidateAccess, assignedCandidateIds } from '../services/access.js';
import { logActivity } from '../services/activity.js';
import { sendMail } from '../services/mailer.js';
import { validateTransition } from '../services/stageRules.js';
import { ROLES } from '../constants.js';

const STAGE_EMAILS = {
  Screening: 'Your application has moved to the screening stage. Our team will be in touch shortly.',
  'Technical Interview': 'Congratulations! You have been shortlisted for a technical interview.',
  'HR Interview': 'Great news - you have progressed to the HR interview round.',
  Offered: 'We are delighted to extend an offer. A recruiter will contact you with the details.',
  Rejected: 'Thank you for your time. After careful consideration we will not be moving forward.',
  Hired: 'Welcome aboard! We are excited to have you join the team.',
};

// scores and rejection details are recruiter-only
const RECRUITER_ONLY_FIELDS = ['ratingAvg', 'ratingCount', 'hireVotes', 'noHireVotes', 'rejectionReason', 'rejectionNote'];
const hiddenForInterviewer = RECRUITER_ONLY_FIELDS.map((f) => `-${f}`).join(' ');

async function buildFilter(req) {
  const { q, stage, position, skill, minExp, maxExp, from, to } = req.query;
  const filter = {};
  if (req.user.role === ROLES.INTERVIEWER) filter._id = { $in: await assignedCandidateIds(req.user) };
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { position: rx }, { skills: rx }];
  }
  if (stage) filter.stage = { $in: stage.split(',').map((s) => s.trim()) };
  if (position) filter.position = new RegExp(escapeRegex(position), 'i');
  if (skill) filter.skills = new RegExp(`^${escapeRegex(skill)}$`, 'i');
  if (minExp != null || maxExp != null) {
    filter.experienceYears = {};
    if (minExp != null) filter.experienceYears.$gte = minExp;
    if (maxExp != null) filter.experienceYears.$lte = maxExp;
  }
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = from;
    if (to) filter.createdAt.$lte = to;
  }
  return filter;
}

export const listCandidates = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const isRecruiter = req.user.role === ROLES.RECRUITER;
  // interviewers must not be able to infer scores through sorting
  const sort = !isRecruiter && req.query.sort.includes('ratingAvg') ? '-createdAt' : req.query.sort;
  const filter = await buildFilter(req);

  const [data, total] = await Promise.all([
    Candidate.find(filter)
      .select(isRecruiter ? '-notes -stageHistory' : `-notes -stageHistory ${hiddenForInterviewer}`)
      .sort(`${sort} -createdAt`)
      .skip((page - 1) * limit)
      .limit(limit),
    Candidate.countDocuments(filter),
  ]);
  res.json({ data, meta: pageMeta(total, page, limit) });
});

export const exportCandidates = asyncHandler(async (req, res) => {
  const filter = await buildFilter(req);
  const rows = await Candidate.find(filter).select('-notes -stageHistory').sort(`${req.query.sort} -createdAt`).limit(5000);
  const header = ['Name', 'Email', 'Phone', 'Position', 'Stage', 'Experience (years)', 'Skills', 'Source', 'Avg rating', 'Feedback count', 'Rejection reason', 'Added'];
  const lines = [header.map(csvCell).join(',')];
  for (const c of rows) {
    lines.push(
      [c.name, c.email, c.phone, c.position, c.stage, c.experienceYears, c.skills.join('; '), c.source, c.ratingCount ? c.ratingAvg : '', c.ratingCount, c.rejectionReason || '', c.createdAt.toISOString().slice(0, 10)]
        .map(csvCell)
        .join(',')
    );
  }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="candidates.csv"');
  res.send(`\uFEFF${lines.join('\r\n')}`);
});

export const getCandidate = asyncHandler(async (req, res) => {
  await assertCandidateAccess(req.user, req.params.id);
  const candidate = await Candidate.findById(req.params.id).populate('createdBy', 'name');
  if (!candidate) throw new AppError('Candidate not found', 404);
  const data = candidate.toJSON();
  if (req.user.role === ROLES.INTERVIEWER) RECRUITER_ONLY_FIELDS.forEach((f) => delete data[f]);
  res.json({ data });
});

export const createCandidate = asyncHandler(async (req, res) => {
  const candidate = await Candidate.create({
    ...req.body,
    createdBy: req.user._id,
    stageHistory: [{ stage: 'Applied', changedBy: req.user._id }],
  });
  await logActivity({
    actor: req.user,
    action: 'candidate.created',
    message: `${req.user.name} added candidate ${candidate.name} (${candidate.position})`,
    candidate: candidate._id,
    entityType: 'Candidate',
    entityId: candidate._id,
  });
  await sendMail({
    to: candidate.email,
    subject: 'We received your application',
    body: `Hi ${candidate.name}, thanks for applying for ${candidate.position}. We will review your profile soon.`,
    kind: 'application_received',
  });
  res.status(201).json({ data: candidate });
});

export const updateCandidate = asyncHandler(async (req, res) => {
  // the stage can only be changed through PATCH /:id/stage, which enforces the pipeline rules
  const candidate = await Candidate.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!candidate) throw new AppError('Candidate not found', 404);
  await logActivity({
    actor: req.user,
    action: 'candidate.updated',
    message: `${req.user.name} updated details of ${candidate.name}`,
    candidate: candidate._id,
    entityType: 'Candidate',
    entityId: candidate._id,
  });
  res.json({ data: candidate });
});

export const updateStage = asyncHandler(async (req, res) => {
  const candidate = await Candidate.findById(req.params.id);
  if (!candidate) throw new AppError('Candidate not found', 404);
  const { stage, rejectionReason, rejectionNote } = req.body;

  const check = validateTransition(candidate.stage, stage);
  if (check.noop) return res.json({ data: candidate });
  if (!check.ok) throw new AppError(check.message, 422, [{ field: 'stage', message: check.message }]);

  const previous = candidate.stage;
  candidate.stage = stage;
  candidate.stageHistory.push({ stage, changedBy: req.user._id });
  if (stage === 'Rejected') {
    candidate.rejectionReason = rejectionReason;
    candidate.rejectionNote = rejectionNote || '';
  }
  await candidate.save();

  await logActivity({
    actor: req.user,
    action: 'candidate.stage_changed',
    message: `${req.user.name} moved ${candidate.name} from ${previous} to ${stage}${stage === 'Rejected' ? ` (${rejectionReason.replace('_', ' ')})` : ''}`,
    candidate: candidate._id,
    entityType: 'Candidate',
    entityId: candidate._id,
    meta: { from: previous, to: stage, rejectionReason },
  });
  if (STAGE_EMAILS[stage]) {
    await sendMail({
      to: candidate.email,
      subject: `Application update: ${stage}`,
      body: `Hi ${candidate.name}, ${STAGE_EMAILS[stage]}`,
      kind: 'stage_change',
    });
  }
  res.json({ data: candidate });
});

const removeResumeFile = (c) =>
  c.resumeFile?.filename
    ? fs.promises.unlink(path.join(env.UPLOAD_DIR, c.resumeFile.filename)).catch(() => {})
    : Promise.resolve();

export const deleteCandidate = asyncHandler(async (req, res) => {
  const candidate = await Candidate.findByIdAndDelete(req.params.id);
  if (!candidate) throw new AppError('Candidate not found', 404);
  await Promise.all([
    Interview.deleteMany({ candidate: candidate._id }),
    Feedback.deleteMany({ candidate: candidate._id }),
    removeResumeFile(candidate),
  ]);
  await logActivity({
    actor: req.user,
    action: 'candidate.deleted',
    message: `${req.user.name} deleted candidate ${candidate.name}`,
    entityType: 'Candidate',
  });
  res.status(204).end();
});

export const uploadResume = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('Choose a PDF, DOC or DOCX file to upload', 422);
  const candidate = await Candidate.findById(req.params.id);
  if (!candidate) {
    await fs.promises.unlink(req.file.path).catch(() => {});
    throw new AppError('Candidate not found', 404);
  }
  await removeResumeFile(candidate);
  candidate.resumeFile = {
    originalName: req.file.originalname,
    filename: req.file.filename,
    size: req.file.size,
    mimetype: req.file.mimetype,
  };
  await candidate.save();
  await logActivity({
    actor: req.user,
    action: 'candidate.updated',
    message: `${req.user.name} uploaded a resume for ${candidate.name}`,
    candidate: candidate._id,
    entityType: 'Candidate',
    entityId: candidate._id,
  });
  res.json({ data: candidate });
});

export const downloadResume = asyncHandler(async (req, res) => {
  await assertCandidateAccess(req.user, req.params.id);
  const candidate = await Candidate.findById(req.params.id);
  if (!candidate?.resumeFile?.filename) throw new AppError('No resume uploaded for this candidate', 404);
  res.download(path.join(env.UPLOAD_DIR, candidate.resumeFile.filename), candidate.resumeFile.originalName);
});

export const deleteResume = asyncHandler(async (req, res) => {
  const candidate = await Candidate.findById(req.params.id);
  if (!candidate) throw new AppError('Candidate not found', 404);
  await removeResumeFile(candidate);
  candidate.resumeFile = undefined;
  await candidate.save();
  res.status(204).end();
});

export const addNote = asyncHandler(async (req, res) => {
  await assertCandidateAccess(req.user, req.params.id);
  const candidate = await Candidate.findById(req.params.id);
  if (!candidate) throw new AppError('Candidate not found', 404);
  candidate.notes.push({ author: req.user._id, authorName: req.user.name, role: req.user.role, text: req.body.text });
  await candidate.save();
  await logActivity({
    actor: req.user,
    action: 'note.added',
    message: `${req.user.name} added a note on ${candidate.name}`,
    candidate: candidate._id,
    entityType: 'Candidate',
    entityId: candidate._id,
  });
  res.status(201).json({ data: candidate.notes[candidate.notes.length - 1] });
});

export const deleteNote = asyncHandler(async (req, res) => {
  await assertCandidateAccess(req.user, req.params.id);
  const candidate = await Candidate.findById(req.params.id);
  if (!candidate) throw new AppError('Candidate not found', 404);
  const note = candidate.notes.id(req.params.noteId);
  if (!note) throw new AppError('Note not found', 404);
  const isAuthor = String(note.author) === String(req.user._id);
  if (!isAuthor && req.user.role !== ROLES.RECRUITER) throw new AppError('You can only delete your own notes', 403);
  note.deleteOne();
  await candidate.save();
  res.status(204).end();
});
