import ActivityLog from '../models/ActivityLog.js';

export async function logActivity({ actor, action, message, candidate, entityType, entityId, meta }) {
  try {
    await ActivityLog.create({
      actor: actor._id || actor,
      action,
      message,
      candidate,
      entityType,
      entityId,
      meta,
    });
  } catch (err) {
    console.error('[activity] failed to log:', err.message);
  }
}
