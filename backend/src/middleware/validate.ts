import type { RequestHandler } from 'express';
import { type ZodType } from 'zod';
import { HttpError } from '../utils/http-error.js';

export interface FieldError {
  path: string;
  message: string;
}

function toDetails(error: { issues: { path: PropertyKey[]; message: string }[] }): FieldError[] {
  return error.issues.map((issue) => ({
    path: issue.path.map((part) => String(part)).join('.'),
    message: issue.message,
  }));
}

export function validateBody<T>(schema: ZodType<T>): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(new HttpError(422, 'Validation failed', 'VALIDATION_ERROR', toDetails(result.error)));
      return;
    }
    req.body = result.data as unknown;
    next();
  };
}

export function validateQuery<T>(schema: ZodType<T>): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      next(new HttpError(422, 'Validation failed', 'VALIDATION_ERROR', toDetails(result.error)));
      return;
    }
    res.locals.query = result.data;
    next();
  };
}
