import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { validate, idParam, objectId } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { uploadResume } from '../middleware/upload.js';
import { ROLES } from '../constants.js';
import * as S from '../validators/schemas.js';
import * as auth from '../controllers/auth.controller.js';
import * as users from '../controllers/users.controller.js';
import * as cand from '../controllers/candidates.controller.js';
import * as intv from '../controllers/interviews.controller.js';
import * as fb from '../controllers/feedback.controller.js';
import * as dash from '../controllers/dashboard.controller.js';
import * as act from '../controllers/activity.controller.js';
import { z } from 'zod';

const { RECRUITER, INTERVIEWER } = ROLES;
const router = Router();

router.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ----- auth -----
router.post('/auth/signup', authLimiter, validate(S.signupSchema), auth.signup);
router.post('/auth/login', authLimiter, validate(S.loginSchema), auth.login);
router.post('/auth/verify-email', authLimiter, validate(S.verifyEmailSchema), auth.verifyEmail);
router.post('/auth/resend-verification', authLimiter, validate(S.resendVerificationSchema), auth.resendVerification);
router.post('/auth/forgot-password', authLimiter, validate(S.forgotSchema), auth.forgotPassword);
router.post('/auth/reset-password', authLimiter, validate(S.resetSchema), auth.resetPassword);
router.get('/auth/me', protect, auth.me);

// everything below requires a valid JWT
router.use(protect);

router.get('/users', authorize(RECRUITER), validate(S.userQuerySchema, 'query'), users.listUsers);
router.get('/dashboard', dash.summary);

// ----- candidates -----
router.get('/candidates', validate(S.candidateQuerySchema, 'query'), cand.listCandidates);
router.post('/candidates', authorize(RECRUITER), validate(S.candidateCreateSchema), cand.createCandidate);
router.get('/candidates/export', authorize(RECRUITER), validate(S.candidateQuerySchema, 'query'), cand.exportCandidates);
router.get('/candidates/:id', idParam, cand.getCandidate);
router.put('/candidates/:id', authorize(RECRUITER), idParam, validate(S.candidateUpdateSchema), cand.updateCandidate);
router.patch('/candidates/:id', authorize(RECRUITER), idParam, validate(S.candidateUpdateSchema), cand.updateCandidate);
router.patch('/candidates/:id/stage', authorize(RECRUITER), idParam, validate(S.stageSchema), cand.updateStage);
router.delete('/candidates/:id', authorize(RECRUITER), idParam, cand.deleteCandidate);
router.post('/candidates/:id/resume', authorize(RECRUITER), idParam, uploadResume, cand.uploadResume);
router.get('/candidates/:id/resume', idParam, cand.downloadResume);
router.delete('/candidates/:id/resume', authorize(RECRUITER), idParam, cand.deleteResume);
router.post('/candidates/:id/notes', idParam, validate(S.noteSchema), cand.addNote);
router.delete(
  '/candidates/:id/notes/:noteId',
  validate(z.object({ id: objectId, noteId: objectId }), 'params'),
  cand.deleteNote
);

// ----- interviews -----
router.get('/interviews', validate(S.interviewQuerySchema, 'query'), intv.listInterviews);
router.post('/interviews', authorize(RECRUITER), validate(S.interviewCreateSchema), intv.createInterview);
router.get('/interviews/:id', idParam, intv.getInterview);
router.put('/interviews/:id', authorize(RECRUITER), idParam, validate(S.interviewUpdateSchema), intv.updateInterview);
router.patch('/interviews/:id', authorize(RECRUITER), idParam, validate(S.interviewUpdateSchema), intv.updateInterview);
router.delete('/interviews/:id', authorize(RECRUITER), idParam, intv.deleteInterview);

// ----- feedback -----
router.get('/feedback', validate(S.feedbackQuerySchema, 'query'), fb.listFeedback);
router.post('/feedback', authorize(INTERVIEWER), validate(S.feedbackCreateSchema), fb.createFeedback);
router.get('/feedback/:id', idParam, fb.getFeedback);
router.put('/feedback/:id', authorize(INTERVIEWER), idParam, validate(S.feedbackUpdateSchema), fb.updateFeedback);
router.patch('/feedback/:id', authorize(INTERVIEWER), idParam, validate(S.feedbackUpdateSchema), fb.updateFeedback);
router.delete('/feedback/:id', idParam, fb.deleteFeedback);

// ----- activity (recruiters only) -----
router.get('/activity', authorize(RECRUITER), validate(S.pageQuerySchema, 'query'), act.listActivity);
router.get('/activity/emails', authorize(RECRUITER), validate(S.pageQuerySchema, 'query'), act.listEmails);

export default router;
