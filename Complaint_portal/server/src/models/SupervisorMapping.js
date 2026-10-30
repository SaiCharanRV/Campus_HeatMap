import mongoose from 'mongoose';
import { CATEGORIES } from '../utils/constants.js';

const mappingSchema = new mongoose.Schema(
  {
    zone: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone', required: true },
    category: { type: String, enum: CATEGORIES, required: true },
    supervisor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

mappingSchema.index({ zone: 1, category: 1 }, { unique: true });

export const SupervisorMapping = mongoose.model('SupervisorMapping', mappingSchema);
