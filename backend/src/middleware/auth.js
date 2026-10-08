import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const protect = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new AppError('Authentication required', 401);

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch {
    throw new AppError('Invalid or expired token', 401);
  }

  const user = await User.findById(payload.id).select('+passwordChangedAt');
  if (!user) throw new AppError('User no longer exists', 401);
  if (user.passwordChangedAt && Math.floor(user.passwordChangedAt.getTime() / 1000) > payload.iat) {
    throw new AppError('Your password was changed. Please log in again.', 401);
  }
  req.user = user;
  next();
});

export const authorize =
  (...roles) =>
  (req, _res, next) =>
    roles.includes(req.user.role)
      ? next()
      : next(new AppError('You do not have permission to perform this action', 403));
