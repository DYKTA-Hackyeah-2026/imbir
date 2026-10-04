export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION_ERROR'
  | 'TOO_MANY_REQUESTS'
  | 'INTERNAL_SERVER_ERROR';

export class HttpError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly details?: unknown;

  constructor(status: number, message: string, code: ErrorCode, details?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, details?: unknown): HttpError {
    return new HttpError(400, message, 'BAD_REQUEST', details);
  }

  static unauthorized(message = 'Unauthorized', details?: unknown): HttpError {
    return new HttpError(401, message, 'UNAUTHORIZED', details);
  }

  static forbidden(message = 'Forbidden', details?: unknown): HttpError {
    return new HttpError(403, message, 'FORBIDDEN', details);
  }

  static notFound(message = 'Not Found', details?: unknown): HttpError {
    return new HttpError(404, message, 'NOT_FOUND', details);
  }

  static conflict(message: string, details?: unknown): HttpError {
    return new HttpError(409, message, 'CONFLICT', details);
  }

  static internal(message = 'Internal Server Error', details?: unknown): HttpError {
    return new HttpError(500, message, 'INTERNAL_SERVER_ERROR', details);
  }
}
