import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES, CATEGORIES } from '../utils/constants.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'student', index: true },
    enrollmentNo: String,
    phone: String,
    hostel: String,
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    // Supervisors and workers belong to one zone + category
    zone: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone' },
    category: { type: String, enum: [...CATEGORIES, null] },
  },
  { timestamps: true }
);

userSchema.methods.setPassword = async function setPassword(password) {
  this.passwordHash = await bcrypt.hash(password, 10);
};

userSchema.methods.comparePassword = function comparePassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

export const User = mongoose.model('User', userSchema);
