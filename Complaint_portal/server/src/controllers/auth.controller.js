import { User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';
import { mailEnabled } from '../config/mailer.js';
import { signToken } from '../middleware/auth.js';
import { createOtp, verifyOtp } from '../services/otp.service.js';
import { sendOtpEmail } from '../services/email.service.js';

const isStudentEmail = (email) =>
  !env.studentEmailDomain || email.endsWith(`@${env.studentEmailDomain}`);

// Without SMTP in development, return the OTP so the flow can be tested from the UI.
const devOtp = (code) => (!mailEnabled && !env.isProd ? { devOtp: code } : {});

const authResponse = (user) => ({ token: signToken(user), user: user.toJSON() });

export async function sendRegisterOtp(req, res) {
  const { email } = req.body;
  if (!isStudentEmail(email)) {
    throw new ApiError(400, `Use your institute email (@${env.studentEmailDomain})`);
  }
  const existing = await User.findOne({ email });
  if (existing?.isVerified) throw new ApiError(409, 'An account with this email already exists. Please log in.');

  const code = await createOtp(email, 'register');
  await sendOtpEmail(email, code, 'register');
  res.json({ message: `OTP sent to ${email}`, ...devOtp(code) });
}

export async function verifyRegister(req, res) {
  const { email, otp, name, password, enrollmentNo, phone, hostel } = req.body;
  if (!isStudentEmail(email)) throw new ApiError(400, `Use your institute email (@${env.studentEmailDomain})`);

  const existing = await User.findOne({ email });
  if (existing?.isVerified) throw new ApiError(409, 'An account with this email already exists. Please log in.');

  await verifyOtp(email, 'register', otp);

  const user = existing || new User({ email });
  Object.assign(user, { name, enrollmentNo, phone, hostel, role: 'student', isVerified: true });
  await user.setPassword(password);
  await user.save();

  res.status(201).json(authResponse(user));
}

export async function login(req, res) {
  const { email, password, role } = req.body;
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Incorrect email or password');
  }
  if (!user.isActive) throw new ApiError(403, 'This account has been disabled. Contact the admin.');

  const isStudent = user.role === 'student';
  if (role === 'student' && !isStudent) throw new ApiError(403, 'This is a staff account. Use the Staff login.');
  if (role === 'staff' && isStudent) throw new ApiError(403, 'This is a student account. Use the Student login.');
  if (isStudent && !user.isVerified) throw new ApiError(403, 'Please verify your email first');

  res.json(authResponse(user));
}

export async function forgotPassword(req, res) {
  const { email } = req.body;
  const user = await User.findOne({ email, isActive: true });
  let extra = {};
  if (user) {
    const code = await createOtp(email, 'reset');
    await sendOtpEmail(email, code, 'reset');
    extra = devOtp(code);
  }
  // Same response whether or not the account exists, so emails can't be probed
  res.json({ message: 'If that account exists, an OTP has been sent to it.', ...extra });
}

export async function resetPassword(req, res) {
  const { email, otp, password } = req.body;
  await verifyOtp(email, 'reset', otp);
  const user = await User.findOne({ email });
  if (!user) throw new ApiError(400, 'Account not found');
  await user.setPassword(password);
  await user.save();
  res.json({ message: 'Password updated. You can log in now.' });
}

export async function me(req, res) {
  await req.user.populate('zone', 'name code');
  res.json({ user: req.user.toJSON() });
}
