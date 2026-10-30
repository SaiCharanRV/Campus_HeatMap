import mongoose from 'mongoose';
import { ALERT_SEVERITIES, ALERT_SHAPES, ALERT_TYPES } from '../utils/constants.js';

const { ObjectId } = mongoose.Schema.Types;

/**
 * A temporary campus notice drawn on the map, e.g.
 * "Road between Library and Chemical Dept closed until Friday — bee hive removal".
 */
const alertSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: String,
    type: { type: String, enum: ALERT_TYPES, required: true },
    severity: { type: String, enum: ALERT_SEVERITIES, default: 'warning' },

    // pin: points[0] · line: points along the road · area: circle at points[0] with radius (m)
    shape: { type: String, enum: ALERT_SHAPES, required: true },
    points: [{ lat: Number, lng: Number, _id: false }],
    radius: Number,
    location: { type: ObjectId, ref: 'Location' },

    startsAt: { type: Date, default: Date.now },
    endsAt: { type: Date, required: true, index: true },
    createdBy: { type: ObjectId, ref: 'User', required: true },
    resolvedAt: Date,
    resolvedBy: { type: ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const Alert = mongoose.model('Alert', alertSchema);
