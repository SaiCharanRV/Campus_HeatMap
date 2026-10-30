import { z } from 'zod';
import {
  ALERT_SEVERITIES,
  ALERT_SHAPES,
  ALERT_TYPES,
  CATEGORIES,
  LOCATION_TYPES,
  PRIORITIES,
  ROLES,
} from './constants.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const email = z.string().trim().toLowerCase().email('Enter a valid email');
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password is too long');
const otp = z.string().trim().regex(/^\d{6}$/, 'OTP must be 6 digits');
// multipart/form-data sends booleans as strings
const boolish = z
  .union([z.boolean(), z.enum(['true', 'false', 'on', ''])])
  .transform((v) => v === true || v === 'true' || v === 'on');
const optionalText = (max) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v === '' ? undefined : v));

const point = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

const alertFields = {
  title: z.string().trim().min(3, 'Title is too short').max(120),
  description: optionalText(1000),
  type: z.enum(ALERT_TYPES),
  severity: z.enum(ALERT_SEVERITIES).default('warning'),
  shape: z.enum(ALERT_SHAPES),
  points: z.array(point).min(1, 'Mark the place on the map').max(50),
  radius: z.coerce.number().min(10).max(2000).optional(),
  locationId: objectId.optional().nullable(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date(),
};

function checkAlertShape(a, ctx) {
  if (a.shape === 'line' && a.points?.length < 2) {
    ctx.addIssue({ code: 'custom', path: ['points'], message: 'A road needs at least 2 points on the map' });
  }
  if (a.shape === 'area' && !a.radius) {
    ctx.addIssue({ code: 'custom', path: ['radius'], message: 'Set the size of the area' });
  }
  if (a.endsAt && a.endsAt <= (a.startsAt || new Date())) {
    ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'End time must be after the start time' });
  }
}

export const schemas = {
  sendOtp: z.object({ email }),
  verifyRegister: z.object({
    email,
    otp,
    name: z.string().trim().min(2, 'Name is required').max(80),
    password,
    enrollmentNo: optionalText(20),
    phone: optionalText(15),
    hostel: optionalText(60),
  }),
  login: z.object({
    email,
    password: z.string().min(1, 'Password is required'),
    role: z.enum(['student', 'staff']),
  }),
  forgotPassword: z.object({ email }),
  resetPassword: z.object({ email, otp, password }),

  createComplaint: z.object({
    category: z.enum(CATEGORIES),
    locationId: objectId,
    title: z.string().trim().min(5, 'Title is too short').max(120),
    description: z.string().trim().min(10, 'Please describe the issue in more detail').max(2000),
    priority: z.enum(PRIORITIES).default('medium'),
    exactSpot: optionalText(120),
    isAnonymous: boolish.optional().default(false),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
  }),
  reopen: z.object({ reason: z.string().trim().min(5, 'Tell us why you are reopening').max(500) }),
  rate: z.object({
    rating: z.coerce.number().int().min(1).max(5),
    feedback: optionalText(500),
  }),
  comment: z.object({ text: z.string().trim().min(1, 'Comment is empty').max(1000) }),

  assign: z.object({ workerId: objectId, note: optionalText(500) }),
  updateStatus: z.object({
    status: z.enum(['IN_PROGRESS', 'RESOLVED']),
    note: optionalText(1000),
  }),
  reject: z.object({ reason: z.string().trim().min(5, 'Give a reason').max(500) }),

  createUser: z.object({
    name: z.string().trim().min(2).max(80),
    email,
    password,
    role: z.enum(ROLES),
    phone: optionalText(15),
    zone: objectId.optional().nullable(),
    category: z.enum(CATEGORIES).optional().nullable(),
  }),
  updateUser: z.object({
    name: z.string().trim().min(2).max(80).optional(),
    role: z.enum(ROLES).optional(),
    phone: optionalText(15),
    zone: objectId.optional().nullable(),
    category: z.enum(CATEGORIES).optional().nullable(),
    isActive: z.boolean().optional(),
    password: password.optional(),
  }),
  zone: z.object({
    name: z.string().trim().min(1).max(60),
    code: z.string().trim().min(1).max(5).toUpperCase(),
    description: optionalText(300),
  }),
  location: z.object({
    name: z.string().trim().min(2).max(100),
    type: z.enum(LOCATION_TYPES),
    zone: objectId,
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
  }),
  mapping: z.object({ zone: objectId, category: z.enum(CATEGORIES), supervisor: objectId }),

  createAlert: z.object(alertFields).superRefine(checkAlertShape),
  // Editing an alert: e.g. extend endsAt or fix the text
  updateAlert: z
    .object({
      title: alertFields.title.optional(),
      description: alertFields.description,
      severity: z.enum(ALERT_SEVERITIES).optional(),
      endsAt: z.coerce.date().optional(),
    })
    .refine((a) => !a.endsAt || a.endsAt > new Date(), { message: 'End time must be in the future', path: ['endsAt'] }),

  acknowledgeRecurring: z.object({ note: optionalText(500) }),
};
