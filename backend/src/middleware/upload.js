import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

fs.mkdirSync(env.UPLOAD_DIR, { recursive: true });

const ALLOWED = {
  '.pdf': ['application/pdf'],
  '.doc': ['application/msword'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
};

export const uploadResume = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, env.UPLOAD_DIR),
    // random name: the original filename is stored in the DB only, never used on disk
    filename: (_req, file, cb) =>
      cb(null, crypto.randomBytes(16).toString('hex') + path.extname(file.originalname).toLowerCase()),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED[ext]?.includes(file.mimetype)) return cb(null, true);
    cb(new AppError('Only PDF, DOC or DOCX files up to 5 MB are allowed', 422));
  },
}).single('resume');
