import mongoose from 'mongoose';
import { STAGES, REJECTION_REASONS } from '../constants.js';

const noteSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: String,
    role: String,
    text: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const historySchema = new mongoose.Schema(
  {
    stage: { type: String, enum: STAGES },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const candidateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, lowercase: true, trim: true, unique: true },
    phone: { type: String, trim: true, default: '' },
    position: { type: String, required: true, trim: true },
    skills: { type: [String], default: [] },
    experienceYears: { type: Number, default: 0, min: 0 },
    source: { type: String, trim: true, default: '' },
    resumeUrl: { type: String, trim: true, default: '' },
    stage: { type: String, enum: STAGES, default: 'Applied', index: true },
    stageHistory: { type: [historySchema], default: [] },
    notes: { type: [noteSchema], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: { type: String, enum: [...REJECTION_REASONS, null] },
    rejectionNote: { type: String, trim: true, maxlength: 500 },
    // denormalised from Feedback so the list can be sorted by score cheaply
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    hireVotes: { type: Number, default: 0 },
    noHireVotes: { type: Number, default: 0 },
    resumeFile: {
      originalName: String,
      filename: String,
      size: Number,
      mimetype: String,
    },
  },
  { timestamps: true }
);

candidateSchema.set('toJSON', {
  transform: (_d, ret) => {
    delete ret.__v;
    if (ret.resumeFile) delete ret.resumeFile.filename; // never expose the on-disk name
    return ret;
  },
});

export default mongoose.model('Candidate', candidateSchema);
