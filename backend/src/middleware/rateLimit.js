import { env } from '../config/env.js';
import rateLimit from 'express-rate-limit';

const base = { standardHeaders: true, legacyHeaders: false, skip: () => env.NODE_ENV === 'test' };

export const apiLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 600,
  message: { message: 'Too many requests, please try again later.' },
});

export const authLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 30,
  message: { message: 'Too many login attempts, please try again in a few minutes.' },
});
