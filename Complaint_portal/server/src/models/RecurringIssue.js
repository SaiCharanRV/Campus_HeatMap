import mongoose from 'mongoose';
import { CATEGORIES } from '../utils/constants.js';

const { ObjectId } = mongoose.Schema.Types;

/**
 * Raised when the same location + category keeps getting complaints
 * (e.g. 3+ water complaints at Govind Bhawan within 30 days): a sign of a root cause.
 */
const recurringSchema = new mongoose.Schema(
  {
    location: { type: ObjectId, ref: 'Location', required: true },
    zone: { type: ObjectId, ref: 'Zone', required: true },
    category: { type: String, enum: CATEGORIES, required: true },
    complaints: [{ type: ObjectId, ref: 'Complaint' }],
    count: { type: Number, default: 0 },
    firstSeenAt: Date,
    lastSeenAt: Date,
    status: { type: String, enum: ['open', 'acknowledged'], default: 'open', index: true },
    acknowledgedBy: { type: ObjectId, ref: 'User' },
    acknowledgedAt: Date,
    note: String,
  },
  { timestamps: true }
);

recurringSchema.index({ location: 1, category: 1, status: 1 });

export const RecurringIssue = mongoose.model('RecurringIssue', recurringSchema);
