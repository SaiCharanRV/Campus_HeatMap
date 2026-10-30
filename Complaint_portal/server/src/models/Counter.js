import mongoose from 'mongoose';

// Atomic sequence counters, e.g. { _id: 'ticket-2026', seq: 123 }
const counterSchema = new mongoose.Schema({
  _id: String,
  seq: { type: Number, default: 0 },
});

export const Counter = mongoose.model('Counter', counterSchema);
