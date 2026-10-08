import mongoose from 'mongoose';
import { RECOMMENDATIONS } from '../constants.js';

const feedbackSchema = new mongoose.Schema(
  {
    // one feedback per interview
    interview: { type: mongoose.Schema.Types.ObjectId, ref: 'Interview', required: true, unique: true },
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true, index: true },
    interviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    recommendation: { type: String, enum: RECOMMENDATIONS, required: true },
    strengths: { type: String, trim: true, default: '' },
    concerns: { type: String, trim: true, default: '' },
    comments: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

feedbackSchema.set('toJSON', {
  transform: (_d, ret) => {
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('Feedback', feedbackSchema);
