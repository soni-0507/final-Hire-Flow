import mongoose from 'mongoose';
import Feedback from '../models/Feedback.js';
import Candidate from '../models/Candidate.js';

/** Recalculate a candidate's average rating and hire / no-hire votes from their feedback. */
export async function recomputeScore(candidateId) {
  const id = new mongoose.Types.ObjectId(String(candidateId));
  const [agg] = await Feedback.aggregate([
    { $match: { candidate: id } },
    {
      $group: {
        _id: null,
        avg: { $avg: '$rating' },
        count: { $sum: 1 },
        hire: { $sum: { $cond: [{ $in: ['$recommendation', ['hire', 'strong_hire']] }, 1, 0] } },
        noHire: { $sum: { $cond: [{ $in: ['$recommendation', ['no_hire', 'strong_no_hire']] }, 1, 0] } },
      },
    },
  ]);
  await Candidate.updateOne(
    { _id: id },
    {
      ratingAvg: agg ? Math.round(agg.avg * 10) / 10 : 0,
      ratingCount: agg?.count || 0,
      hireVotes: agg?.hire || 0,
      noHireVotes: agg?.noHire || 0,
    }
  );
}
