import dotenv from 'dotenv';
import path from 'path';
import { securityProblems } from './security.js';
dotenv.config();

const problems = securityProblems(process.env);
if (problems.length) {
  console.error('\nRefusing to start with an insecure production configuration:');
  problems.forEach((p) => console.error(` - ${p}`));
  console.error('Set these in your .env file (see README, "Security and public sharing").\n');
  process.exit(1);
}

export const env = {
  PORT: process.env.PORT || 5000,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hiring_pipeline',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  NODE_ENV: process.env.NODE_ENV || 'development',
  // Recruiters must know this code to sign up. Interviewers can sign up freely.
  RECRUITER_INVITE_CODE: process.env.RECRUITER_INVITE_CODE || 'JOIN-RECRUITERS',
  // Demo convenience: return the password-reset link in the API response (the mock mailer can't deliver it).
  // Off by default. Anyone could take over an account with it if the app is reachable from the internet.
  SHOW_RESET_LINK: (process.env.SHOW_RESET_LINK ?? 'false') === 'true',

  // Real mailbox verification. Signup is blocked unless SMTP is configured.
  // Free hosts (Render, Railway...) block SMTP ports. Brevo's HTTPS API works anywhere and has a free plan.
  BREVO_API_KEY: process.env.BREVO_API_KEY || '',
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: Number(process.env.SMTP_PORT || 587),
  SMTP_SECURE: (process.env.SMTP_SECURE ?? 'false') === 'true',
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  MAIL_FROM: process.env.MAIL_FROM || process.env.SMTP_USER || '',
  EMAIL_VERIFICATION_EXPIRES_MINUTES: Number(process.env.EMAIL_VERIFICATION_EXPIRES_MINUTES || 15),

  UPLOAD_DIR: process.env.UPLOAD_DIR || path.resolve('uploads'),
};
