import mongoose from 'mongoose';
import { CATEGORIES, PRIORITIES, STATUSES } from '../utils/constants.js';

const { ObjectId } = mongoose.Schema.Types;

const complaintSchema = new mongoose.Schema(
  {
    ticketId: { type: String, required: true, unique: true },
    student: { type: ObjectId, ref: 'User', required: true, index: true },
    isAnonymous: { type: Boolean, default: false },

    category: { type: String, enum: CATEGORIES, required: true, index: true },
    location: { type: ObjectId, ref: 'Location', required: true, index: true },
    zone: { type: ObjectId, ref: 'Zone', required: true, index: true },
    exactSpot: String,
    pin: { lat: Number, lng: Number },

    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    images: [String],
    priority: { type: String, enum: PRIORITIES, default: 'medium' },

    status: { type: String, enum: STATUSES, default: 'SUBMITTED', index: true },
    supervisor: { type: ObjectId, ref: 'User', index: true },
    assignedWorker: { type: ObjectId, ref: 'User', index: true },

    upvotes: [{ type: ObjectId, ref: 'User' }],

    resolutionImages: [String],
    rating: { type: Number, min: 1, max: 5 },
    feedback: String,

    slaDeadline: Date,
    escalated: { type: Boolean, default: false },
    escalatedAt: Date,

    assignedAt: Date,
    resolvedAt: Date,
    closedAt: Date,
  },
  { timestamps: true }
);

complaintSchema.index({ title: 'text', description: 'text', ticketId: 'text' });
complaintSchema.index({ status: 1, slaDeadline: 1 });

export const Complaint = mongoose.model('Complaint', complaintSchema);
