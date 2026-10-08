import mongoose from 'mongoose';
import { INTERVIEW_TYPES, INTERVIEW_MODES, INTERVIEW_STATUS } from '../constants.js';

const interviewSchema = new mongoose.Schema(
  {
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true, index: true },
    interviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    scheduledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    scheduledAt: { type: Date, required: true, index: true },
    durationMins: { type: Number, default: 60, min: 15, max: 480 },
    type: { type: String, enum: INTERVIEW_TYPES, required: true },
    mode: { type: String, enum: INTERVIEW_MODES, default: 'video' },
    location: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
    status: { type: String, enum: INTERVIEW_STATUS, default: 'scheduled', index: true },
  },
  { timestamps: true }
);

interviewSchema.set('toJSON', {
  transform: (_d, ret) => {
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('Interview', interviewSchema);
