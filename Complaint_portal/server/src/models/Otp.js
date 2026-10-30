import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, index: true },
  otpHash: { type: String, required: true },
  purpose: { type: String, enum: ['register', 'reset'], required: true },
  attempts: { type: Number, default: 0 },
  // TTL index: MongoDB removes the document once expiresAt has passed
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
});

export const Otp = mongoose.model('Otp', otpSchema);
