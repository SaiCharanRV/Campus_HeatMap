import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { UPLOAD_DIR } from './services/storage.service.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  // Uploaded images are loaded by the client from another origin
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: env.clientUrl, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  if (!env.isProd) app.use(morgan('dev'));

  app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));
  app.use('/api', routes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
