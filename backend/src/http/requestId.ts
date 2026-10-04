import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Locals {
      requestId: string;
    }
  }
}

function isSafeId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 128 && /^[\w.:-]+$/.test(value);
}

/**
 * Accepts a caller supplied correlation id when it is well formed, otherwise
 * mints a fresh opaque id. The id is echoed on the response and used in errors.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header(REQUEST_ID_HEADER) ?? req.header('x-correlation-id');
  res.locals.requestId = isSafeId(incoming) ? incoming : randomUUID();
  res.setHeader(REQUEST_ID_HEADER, res.locals.requestId);
  next();
}
