import { z } from 'zod';
import {
  ROLES,
  STAGES,
  INTERVIEW_TYPES,
  INTERVIEW_MODES,
  INTERVIEW_STATUS,
  RECOMMENDATIONS,
  REJECTION_REASONS,
} from '../constants.js';
import { objectId } from '../middleware/validate.js';

const optionalText = (max) => z.string().trim().max(max).optional().default('');

// ---------- auth ----------
const passwordRule = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a number');

export const signupSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: passwordRule,
  role: z.enum(Object.values(ROLES), { errorMap: () => ({ message: 'Role must be recruiter or interviewer' }) }),
  inviteCode: z.string().trim().max(100).optional(),
});

export const forgotSchema = z.object({ email: z.string().trim().toLowerCase().email('Enter a valid email address') });
export const verifyEmailSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit verification code'),
});
export const resendVerificationSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
});
export const resetSchema = z.object({ token: z.string().min(20, 'Reset link is invalid'), password: passwordRule });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ---------- candidates ----------
const candidateFields = {
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  phone: optionalText(30),
  position: z.string().trim().min(2, 'Position is required').max(100),
  skills: z.array(z.string().trim().min(1).max(40)).max(30).default([]),
  experienceYears: z.coerce.number().min(0).max(60).default(0),
  source: optionalText(60),
  resumeUrl: z.union([z.string().trim().url('Enter a valid URL'), z.literal('')]).optional().default(''),
};

export const candidateCreateSchema = z.object(candidateFields);
export const candidateUpdateSchema = z.object(candidateFields).partial();

export const stageSchema = z
  .object({
    stage: z.enum(STAGES, { errorMap: () => ({ message: `Stage must be one of: ${STAGES.join(', ')}` }) }),
    rejectionReason: z.enum(REJECTION_REASONS).optional(),
    rejectionNote: z.string().trim().max(500).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.stage === 'Rejected' && !v.rejectionReason) {
      ctx.addIssue({ code: 'custom', path: ['rejectionReason'], message: 'Select a rejection reason' });
    }
  });

export const noteSchema = z.object({ text: z.string().trim().min(1, 'Note cannot be empty').max(2000) });

export const candidateQuerySchema = z.object({
  q: z.string().trim().optional(),
  stage: z.string().trim().optional(), // comma separated
  position: z.string().trim().optional(),
  skill: z.string().trim().optional(),
  minExp: z.coerce.number().min(0).optional(),
  maxExp: z.coerce.number().min(0).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  sort: z.enum(['createdAt', '-createdAt', 'name', '-name', 'experienceYears', '-experienceYears', 'ratingAvg', '-ratingAvg']).default('-createdAt'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(10),
});

// ---------- interviews ----------
const interviewFields = {
  candidate: objectId,
  interviewer: objectId,
  scheduledAt: z.coerce.date({ errorMap: () => ({ message: 'Enter a valid date and time' }) }),
  durationMins: z.coerce.number().int().min(15).max(480).default(60),
  type: z.enum(INTERVIEW_TYPES),
  mode: z.enum(INTERVIEW_MODES).default('video'),
  location: optionalText(200),
  notes: optionalText(1000),
};
export const interviewCreateSchema = z.object(interviewFields);
export const interviewUpdateSchema = z
  .object(interviewFields)
  .partial()
  .extend({ status: z.enum(INTERVIEW_STATUS).optional() });

export const interviewQuerySchema = z.object({
  when: z.enum(['upcoming', 'past']).optional(),
  status: z.enum(INTERVIEW_STATUS).optional(),
  candidate: objectId.optional(),
  interviewer: objectId.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(20),
});

// ---------- feedback ----------
const feedbackFields = {
  interview: objectId,
  rating: z.coerce.number().int().min(1, 'Rating must be 1-5').max(5, 'Rating must be 1-5'),
  recommendation: z.enum(RECOMMENDATIONS, { errorMap: () => ({ message: 'Select a recommendation' }) }),
  strengths: optionalText(2000),
  concerns: optionalText(2000),
  comments: optionalText(2000),
};
export const feedbackCreateSchema = z.object(feedbackFields);
export const feedbackUpdateSchema = z.object(feedbackFields).omit({ interview: true }).partial();

export const feedbackQuerySchema = z.object({
  candidate: objectId.optional(),
  interview: objectId.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(20),
});

// ---------- misc ----------
export const userQuerySchema = z.object({ role: z.enum(Object.values(ROLES)).optional() });
export const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
