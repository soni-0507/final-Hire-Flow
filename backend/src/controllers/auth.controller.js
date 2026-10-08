import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendMail } from '../services/mailer.js';
import { ROLES } from '../constants.js';
import { validateMailboxDomain } from '../services/emailVerifier.js';

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

const makeVerificationCode = () => (env.NODE_ENV === 'test' ? '123456' : String(crypto.randomInt(100000, 1000000)));

const MAX_CODE_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;
// Compared against when the email is unknown, so response time doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('hireflow-timing-equaliser', 12);

const VERIFY_FIELDS = '+emailVerificationTokenHash +emailVerificationExpires +emailVerificationAttempts +emailVerificationSentAt';

function safeEqual(a, b) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/** Server-side limit on how often a code email can be requested for one account. */
function assertResendCooldown(user) {
  if (env.NODE_ENV === 'test' || !user.emailVerificationSentAt) return;
  const elapsed = Date.now() - user.emailVerificationSentAt.getTime();
  if (elapsed < RESEND_COOLDOWN_MS) {
    const wait = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
    throw new AppError(`Please wait ${wait}s before requesting another code.`, 429);
  }
}

async function sendVerification(user) {
  const code = makeVerificationCode();
  user.emailVerificationTokenHash = sha256(code);
  user.emailVerificationExpires = new Date(Date.now() + env.EMAIL_VERIFICATION_EXPIRES_MINUTES * 60 * 1000);
  user.emailVerificationAttempts = 0;
  user.emailVerificationSentAt = new Date();
  await user.save();

  await sendMail({
    to: user.email,
    subject: 'Verify your HireFlow email',
    body: `Your HireFlow verification code is ${code}. It expires in ${env.EMAIL_VERIFICATION_EXPIRES_MINUTES} minutes. If you did not create this account, ignore this email.`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto;padding:32px">
        <h2 style="margin:0 0 8px;color:#111827">Verify your HireFlow email</h2>
        <p style="color:#6b7280">Enter this code in HireFlow to prove you control this email address.</p>
        <div style="font-size:34px;letter-spacing:10px;font-weight:800;padding:18px 22px;background:#f5f3ff;border-radius:14px;text-align:center;color:#4f46e5">${code}</div>
        <p style="color:#6b7280">This code expires in ${env.EMAIL_VERIFICATION_EXPIRES_MINUTES} minutes.</p>
      </div>
    `,
    kind: 'email_verification',
  });
}

/** Registration creates an unverified account and sends a real mailbox verification code. */
export const signup = asyncHandler(async (req, res) => {
  const { name, email, password, role, inviteCode } = req.body;

  const mailboxCheck = await validateMailboxDomain(email);
  if (!mailboxCheck.valid) {
    throw new AppError(mailboxCheck.message, 400, [{ field: 'email', message: mailboxCheck.message, code: mailboxCheck.code }]);
  }

  if (role === ROLES.RECRUITER && inviteCode !== env.RECRUITER_INVITE_CODE) {
    const message = 'Invalid recruiter invite code';
    throw new AppError(message, 403, [{ field: 'inviteCode', message }]);
  }

  const done = {
    message: 'Account created. Check your email for the 6-digit verification code.',
    email,
    requiresVerification: true,
  };

  const existing = await User.findOne({ email }).select(VERIFY_FIELDS);
  if (existing) {
    if (existing.emailVerified) {
      const message = 'This email is already registered. Please log in instead.';
      throw new AppError(message, 409, [{ field: 'email', message }]);
    }
    // Unverified account: whoever signs up now replaces the details. Otherwise someone could
    // pre-register a victim's email with their own password and take over once the victim verifies.
    assertResendCooldown(existing);
    existing.name = name;
    existing.password = password;
    existing.role = role;
    try {
      await sendVerification(existing);
    } catch {
      throw new AppError('We could not send the verification email. Please try again later.', 503);
    }
    return res.status(201).json(done);
  }

  const user = await User.create({ name, email, password, role, emailVerified: false });
  try {
    await sendVerification(user);
  } catch {
    await User.deleteOne({ _id: user._id });
    throw new AppError('We could not send the verification email. Please try again after SMTP email is configured.', 503);
  }

  res.status(201).json(done);
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const { email, code } = req.body;
  const user = await User.findOne({ email }).select(VERIFY_FIELDS);
  const invalid = () => new AppError('That code is incorrect or has expired. Request a new code.', 400);
  if (!user) throw invalid();
  if (user.emailVerified) return res.json({ message: 'Email is already verified. You can log in now.' });
  if (!user.emailVerificationTokenHash || !user.emailVerificationExpires || user.emailVerificationExpires <= new Date()) {
    throw new AppError('This verification code has expired. Request a new code.', 400);
  }

  if (!safeEqual(sha256(code), user.emailVerificationTokenHash)) {
    user.emailVerificationAttempts = (user.emailVerificationAttempts || 0) + 1;
    if (user.emailVerificationAttempts >= MAX_CODE_ATTEMPTS) {
      // Too many guesses: burn the code so it can't be brute-forced.
      user.emailVerificationTokenHash = undefined;
      user.emailVerificationExpires = undefined;
      await user.save();
      throw new AppError('Too many incorrect attempts. Request a new code.', 429);
    }
    await user.save();
    throw new AppError(`That verification code is incorrect. ${MAX_CODE_ATTEMPTS - user.emailVerificationAttempts} attempts left.`, 400);
  }

  user.emailVerified = true;
  user.emailVerificationTokenHash = undefined;
  user.emailVerificationExpires = undefined;
  user.emailVerificationAttempts = undefined;
  user.emailVerificationSentAt = undefined;
  await user.save();
  res.json({ message: 'Email verified successfully. You can log in now.' });
});

export const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email }).select(VERIFY_FIELDS);
  const message = 'If this email has an unverified account, a new verification code was sent.';
  if (!user || user.emailVerified) return res.json({ message });

  assertResendCooldown(user);
  try {
    await sendVerification(user);
  } catch {
    throw new AppError('We could not send the verification email. Please try again later.', 503);
  }
  res.json({ message });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  // One generic message for unknown email and wrong password, so accounts can't be enumerated.
  const ok = user ? await user.comparePassword(password) : (await bcrypt.compare(password, DUMMY_HASH), false);
  if (!ok) throw new AppError('Invalid email or password.', 401);
  if (!user.emailVerified) {
    throw new AppError('Please verify your email before logging in.', 403, [{ field: 'email', message: 'Email verification required.' }]);
  }
  res.json({ token: signToken(user), user });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  let devResetLink;

  if (user && user.emailVerified) {
    const token = crypto.randomBytes(32).toString('hex');
    user.resetTokenHash = sha256(token);
    user.resetTokenExpires = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();

    const link = `${env.CLIENT_ORIGIN.split(',')[0].trim()}/reset-password?token=${token}`;
    await sendMail({
      to: user.email,
      subject: 'Reset your HireFlow password',
      body: `A password reset was requested for your HireFlow account. Open this link within 30 minutes: ${link}`,
      kind: 'password_reset',
    });
    if (env.SHOW_RESET_LINK) devResetLink = link;
  }

  res.json({
    message: 'If a verified account exists for this email, a password reset link has been sent.',
    ...(devResetLink ? { devResetLink } : {}),
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    resetTokenHash: sha256(req.body.token),
    resetTokenExpires: { $gt: new Date() },
  }).select('+password +resetTokenHash +resetTokenExpires');
  if (!user) throw new AppError('This reset link is invalid or has expired. Request a new one.', 400);

  user.password = req.body.password;
  user.resetTokenHash = undefined;
  user.resetTokenExpires = undefined;
  await user.save();
  res.json({ message: 'Password updated. You can log in now.' });
});
