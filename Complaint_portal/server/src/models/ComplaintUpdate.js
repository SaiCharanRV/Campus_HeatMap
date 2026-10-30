import mongoose from 'mongoose';
import { STATUSES } from '../utils/constants.js';

// One entry per change on a complaint; together they form its timeline.
const updateSchema = new mongoose.Schema(
  {
    complaint: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', required: true, index: true },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // null = system
    type: { type: String, enum: ['status', 'escalation', 'upvote_priority'], default: 'status' },
    fromStatus: { type: String, enum: [...STATUSES, null] },
    toStatus: { type: String, enum: STATUSES },
    note: String,
    images: [String],
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const ComplaintUpdate = mongoose.model('ComplaintUpdate', updateSchema);
