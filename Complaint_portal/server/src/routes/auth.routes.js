import { Router } from 'express';
import * as auth from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { otpLimiter, loginLimiter } from '../middleware/rateLimit.js';
import { schemas } from '../utils/validators.js';

const router = Router();

router.post('/register/send-otp', otpLimiter, validate(schemas.sendOtp), auth.sendRegisterOtp);
router.post('/register/verify', loginLimiter, validate(schemas.verifyRegister), auth.verifyRegister);
router.post('/login', loginLimiter, validate(schemas.login), auth.login);
router.post('/forgot-password', otpLimiter, validate(schemas.forgotPassword), auth.forgotPassword);
router.post('/reset-password', loginLimiter, validate(schemas.resetPassword), auth.resetPassword);
router.get('/me', requireAuth, auth.me);

export default router;
