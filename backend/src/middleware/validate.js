import { z } from 'zod';
import { AppError } from '../utils/AppError.js';

export const validate =
  (schema, source = 'body') =>
  (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const errors = result.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      return next(new AppError('Validation failed', 422, errors));
    }
    req[source] = result.data;
    next();
  };

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
export const idParam = validate(z.object({ id: objectId }), 'params');
