import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Otp } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

/** Creates a fresh 6-digit OTP (replacing any earlier one) and returns the plain code. */
export async function createOtp(email, purpose) {
  const code = crypto.randomInt(100000, 1000000).toString();
  await Otp.deleteMany({ email, purpose });
  await Otp.create({
    email,
    purpose,
    otpHash: await bcrypt.hash(code, 10),
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });
  return code;
}

/** Throws unless the code matches. A matched OTP is consumed. */
export async function verifyOtp(email, purpose, code) {
  const otp = await Otp.findOne({ email, purpose });
  if (!otp || otp.expiresAt < new Date()) {
    throw new ApiError(400, 'OTP expired or not found. Please request a new one.');
  }
  if (otp.attempts >= MAX_ATTEMPTS) {
    await otp.deleteOne();
    throw new ApiError(429, 'Too many wrong attempts. Please request a new OTP.');
  }

  const ok = await bcrypt.compare(code, otp.otpHash);
  if (!ok) {
    otp.attempts += 1;
    await otp.save();
    const left = MAX_ATTEMPTS - otp.attempts;
    throw new ApiError(400, `Incorrect OTP. ${left} attempt${left === 1 ? '' : 's'} left.`);
  }
  await otp.deleteOne();
}
