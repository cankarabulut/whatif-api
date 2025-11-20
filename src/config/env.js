import dotenv from 'dotenv';
dotenv.config();

export const env = {
  port: Number(process.env.PORT || 8080),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),
  fdKey: process.env.FOOTBALL_DATA_KEY,
  tsdbKey: process.env.THESPORTSDB_KEY || '1',
  redisUrl: process.env.REDIS_URL,
  cacheTTL: Number(process.env.CACHE_TTL_SECONDS || 60),
  rlWindow: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
  rlMax: Number(process.env.RATE_LIMIT_MAX || 60),
};
