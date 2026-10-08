import ActivityLog from '../models/ActivityLog.js';
import Notification from '../models/Notification.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { pageMeta } from '../utils/helpers.js';

export const listActivity = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const [data, total] = await Promise.all([
    ActivityLog.find()
      .populate('actor', 'name role')
      .populate('candidate', 'name')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit),
    ActivityLog.countDocuments(),
  ]);
  res.json({ data, meta: pageMeta(total, page, limit) });
});

export const listEmails = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const [data, total] = await Promise.all([
    Notification.find()
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit),
    Notification.countDocuments(),
  ]);
  res.json({ data, meta: pageMeta(total, page, limit) });
});
