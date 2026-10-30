import 'dotenv/config';

const port = Number(process.env.PORT) || 5000;

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port,
  mongoUri: process.env.MONGO_URI || 'memory',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  serverUrl: process.env.SERVER_URL || `http://localhost:${port}`,
  // Empty = any email can register as a student; e.g. "iitr.ac.in" to restrict
  studentEmailDomain: (process.env.STUDENT_EMAIL_DOMAIN || '').trim().toLowerCase(),
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.MAIL_FROM || 'IITR Complaint Portal <no-reply@iitr.ac.in>',
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  sla: {
    assignHours: Number(process.env.SLA_ASSIGN_HOURS) || 24,
    autoCloseDays: Number(process.env.SLA_AUTO_CLOSE_DAYS) || 3,
    reopenDays: Number(process.env.SLA_REOPEN_DAYS) || 7,
  },
  recurring: {
    // Flag a location + category once it gets this many complaints within windowDays
    threshold: Number(process.env.RECURRING_THRESHOLD) || 3,
    windowDays: Number(process.env.RECURRING_WINDOW_DAYS) || 30,
  },
};

if (env.isProd && env.jwtSecret === 'dev-secret-change-me') {
  throw new Error('JWT_SECRET must be set in production');
}
