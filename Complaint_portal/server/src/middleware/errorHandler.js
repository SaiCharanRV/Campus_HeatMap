import multer from 'multer';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

export function notFound(req, _res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ message: err.message, details: err.details });
  }
  if (err instanceof ZodError) {
    const issues = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    return res.status(400).json({ message: issues[0]?.message || 'Invalid input', details: issues });
  }
  if (err instanceof multer.MulterError) {
    const text =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Each image must be 5 MB or smaller'
        : err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE'
          ? 'You can upload at most 5 images'
          : err.message;
    return res.status(400).json({ message: text });
  }
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ message: `Invalid ${err.path}` });
  }
  if (err?.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'value';
    return res.status(409).json({ message: `That ${field} is already in use` });
  }

  console.error(err);
  res.status(500).json({ message: env.isProd ? 'Something went wrong' : err.message });
}
