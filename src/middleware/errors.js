import { logger } from '../utils/logger.js';
import { serverError } from '../utils/http.js';

export function notFound(req, res) {
  res.status(404).json({ ok: false, error: 'Not Found' });
}

export function errorHandler(err, req, res, next) {
  logger.error({ err }, 'Unhandled error');
  return serverError(res, err.message || 'Internal error');
}
