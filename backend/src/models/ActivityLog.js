import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, required: true, index: true },
    message: { type: String, required: true },
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate' },
    entityType: String,
    entityId: mongoose.Schema.Types.ObjectId,
    meta: mongoose.Schema.Types.Mixed,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

activitySchema.index({ createdAt: -1 });
// audit entries expire after 90 days (adjust to your retention policy)
activitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });

export default mongoose.model('ActivityLog', activitySchema);
