import mongoose from 'mongoose';
import { CATEGORIES, OPEN_STATUSES, PRIORITIES, STATUSES } from './constants.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isId = (v) => typeof v === 'string' && mongoose.isValidObjectId(v);

/**
 * Builds a Mongo filter from query-string params:
 * location, category, status (a status, "open" or "closed"), priority, q, from, to, escalated.
 */
export function buildComplaintFilter(query = {}) {
  const filter = {};
  const { location, category, status, priority, q, from, to, escalated } = query;

  if (isId(location)) filter.location = new mongoose.Types.ObjectId(location);
  if (CATEGORIES.includes(category)) filter.category = category;
  if (PRIORITIES.includes(priority)) filter.priority = priority;

  if (status === 'open') filter.status = { $in: OPEN_STATUSES };
  else if (status === 'closed') filter.status = { $in: ['RESOLVED', 'CLOSED', 'REJECTED'] };
  else if (STATUSES.includes(status)) filter.status = status;

  if (escalated === 'true') filter.escalated = true;

  if (from || to) {
    filter.createdAt = {};
    if (from && !Number.isNaN(Date.parse(from))) filter.createdAt.$gte = new Date(from);
    if (to && !Number.isNaN(Date.parse(to))) filter.createdAt.$lte = new Date(`${to}T23:59:59.999`);
  }

  if (typeof q === 'string' && q.trim()) {
    const rx = new RegExp(escapeRegex(q.trim().slice(0, 100)), 'i');
    filter.$or = [{ ticketId: rx }, { title: rx }, { description: rx }];
  }
  return filter;
}

export function pageParams(query = {}, defaultLimit = 20) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}
