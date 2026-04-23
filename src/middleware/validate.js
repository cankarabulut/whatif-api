import { ZodError } from 'zod';
import { badRequest } from '../utils/http.js';

export const validate = (schema) => (req, res, next) => {
  try {
    req.valid = schema.parse({
      params: req.params,
      query: req.query,
      body: req.body,
    });
    next();
  } catch (e) {
    if (e instanceof ZodError) {
      return badRequest(res, e.flatten());
    }
    next(e);
  }
};
