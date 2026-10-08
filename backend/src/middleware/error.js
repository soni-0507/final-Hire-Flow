import { env } from '../config/env.js';

export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  let status = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errors = err.errors;

  if (err.name === 'CastError') {
    status = 400;
    message = `Invalid ${err.path}`;
  } else if (err.name === 'ValidationError' && err.errors) {
    status = 422;
    errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    message = 'Validation failed';
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    message =
      field === 'interview'
        ? 'Feedback already submitted for this interview'
        : `A record with this ${field} already exists`;
    errors = [{ field, message }];
  } else if (err.name === 'MulterError') {
    status = 422;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large (max 5 MB)' : err.message;
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Malformed JSON body';
  }

  if (status >= 500) console.error(err);

  res.status(status).json({
    message: status >= 500 && env.NODE_ENV === 'production' ? 'Internal server error' : message,
    ...(errors ? { errors } : {}),
    ...(env.NODE_ENV !== 'production' && status >= 500 ? { stack: err.stack } : {}),
  });
}
