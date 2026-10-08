import mongoose from 'mongoose';

// Stores "sent" emails produced by the mock mail service.
const notificationSchema = new mongoose.Schema(
  {
    to: { type: String, required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    kind: { type: String, default: 'general' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// the mock outbox is a demo aid: keep 90 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });

export default mongoose.model('Notification', notificationSchema);
