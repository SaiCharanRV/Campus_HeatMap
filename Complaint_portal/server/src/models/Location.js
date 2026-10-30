import mongoose from 'mongoose';
import { LOCATION_TYPES } from '../utils/constants.js';

const locationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    type: { type: String, enum: LOCATION_TYPES, default: 'other' },
    zone: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone', required: true },
    // GeoJSON point: [lng, lat]
    coordinates: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
    // Optional building outline
    boundary: {
      type: { type: String, enum: ['Polygon'] },
      coordinates: { type: [[[Number]]], default: undefined },
    },
  },
  { timestamps: true }
);

locationSchema.index({ coordinates: '2dsphere' });

locationSchema.virtual('lat').get(function lat() {
  return this.coordinates?.coordinates?.[1];
});
locationSchema.virtual('lng').get(function lng() {
  return this.coordinates?.coordinates?.[0];
});
locationSchema.set('toJSON', { virtuals: true, versionKey: false });

export const Location = mongoose.model('Location', locationSchema);
