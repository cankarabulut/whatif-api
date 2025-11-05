import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // mobile fetch/curl
    if (env.corsOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('CORS not allowed'), false);
  },
  credentials: true,
};

export function applySecurity(app) {
  app.use(pinoHttp({ logger }));
  app.use(helmet());
  app.use(compression());
  app.use(cors(corsOptions));
  app.use(rateLimit({ windowMs: env.rlWindow, max: env.rlMax, standardHeaders: true }));
}
