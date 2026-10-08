import Interview from '../models/Interview.js';
import { AppError } from '../utils/AppError.js';
import { ROLES } from '../constants.js';

/** Recruiters can see everyone. Interviewers only see candidates they are assigned to interview. */
export async function assertCandidateAccess(user, candidateId) {
  if (user.role === ROLES.RECRUITER) return;
  const assigned = await Interview.exists({ candidate: candidateId, interviewer: user._id });
  if (!assigned) throw new AppError('This candidate is not assigned to you', 403);
}

export async function assignedCandidateIds(user) {
  return Interview.distinct('candidate', { interviewer: user._id });
}
