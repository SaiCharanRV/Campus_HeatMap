import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

const message = (text) => ({ message: text });
// The automated tests log in many times from one address
const isTest = env.nodeEnv === 'test';

export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isTest ? 1000 : 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: message('Too many OTP requests. Try again in 15 minutes.'),
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isTest ? 1000 : 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: message('Too many login attempts. Try again in 15 minutes.'),
});
