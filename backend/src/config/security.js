const WEAK = /change-me|replace-me|dev-only|^secret$|^password/i;

/** Returns a list of unsafe settings. Only enforced in production. */
export function securityProblems({ NODE_ENV, JWT_SECRET, RECRUITER_INVITE_CODE, SHOW_RESET_LINK }) {
  if (NODE_ENV !== 'production') return [];
  const problems = [];
  if (!JWT_SECRET || JWT_SECRET.length < 32 || WEAK.test(JWT_SECRET)) {
    problems.push('JWT_SECRET must be a random string of at least 32 characters (try: openssl rand -hex 32)');
  }
  if (!RECRUITER_INVITE_CODE || RECRUITER_INVITE_CODE === 'JOIN-RECRUITERS' || WEAK.test(RECRUITER_INVITE_CODE)) {
    problems.push('RECRUITER_INVITE_CODE must be set to your own private code (not the documented default)');
  }
  if (String(SHOW_RESET_LINK) === 'true') {
    problems.push('SHOW_RESET_LINK must be false in production (it returns password-reset links in API responses)');
  }
  return problems;
}
