import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listUsers = asyncHandler(async (req, res) => {
  const filter = req.query.role ? { role: req.query.role } : {};
  const data = await User.find(filter).sort('name').select('name email role');
  res.json({ data });
});
