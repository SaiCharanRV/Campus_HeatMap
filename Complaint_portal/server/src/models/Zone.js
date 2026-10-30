import mongoose from 'mongoose';

const zoneSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: String,
  },
  { timestamps: true }
);

export const Zone = mongoose.model('Zone', zoneSchema);
