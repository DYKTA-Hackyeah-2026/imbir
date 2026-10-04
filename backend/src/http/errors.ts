/**
 * Error taxonomy shared by every endpoint. `message` is always safe to show
 * to an end user and is written in plain Polish.
 */
export const ERROR_CODES = [
  'bad_request',
  'validation_error',
  'unauthorized',
  'forbidden',
  'not_found',
  'conflict',
  'unsupported_media_type',
  'payload_too_large',
  'unprocessable_entity',
  'too_many_requests',
  'service_degraded',
  'upstream_unavailable',
  'internal_error',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

interface ApiErrorOptions {
  statusCode: number;
  code: ErrorCode;
  message: string;
  retryable?: boolean;
  details?: unknown;
}

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode;
  readonly retryable: boolean;
  readonly details?: unknown;

  constructor(options: ApiErrorOptions) {
    super(options.message);
    this.name = 'ApiError';
    this.statusCode = options.statusCode;
    this.code = options.code;
    this.retryable = options.retryable ?? false;
    this.details = options.details;
  }

  static badRequest(message: string, details?: unknown): ApiError {
    return new ApiError({ statusCode: 400, code: 'bad_request', message, details });
  }

  static validation(message: string, details?: unknown): ApiError {
    return new ApiError({ statusCode: 400, code: 'validation_error', message, details });
  }

  static unprocessable(message: string, details?: unknown): ApiError {
    return new ApiError({ statusCode: 422, code: 'unprocessable_entity', message, details });
  }

  static unauthorized(message = 'Unauthorized', details?: unknown): ApiError {
    return new ApiError({ statusCode: 401, code: 'unauthorized', message, details });
  }

  static forbidden(message = 'Forbidden', details?: unknown): ApiError {
    return new ApiError({ statusCode: 403, code: 'forbidden', message, details });
  }

  static notFound(message = 'Not Found', details?: unknown): ApiError {
    return new ApiError({ statusCode: 404, code: 'not_found', message, details });
  }

  static conflict(message: string, details?: unknown): ApiError {
    return new ApiError({ statusCode: 409, code: 'conflict', message, details });
  }

  static tooManyRequests(message: string, details?: unknown): ApiError {
    return new ApiError({ statusCode: 429, code: 'too_many_requests', message, details });
  }

  static upstreamUnavailable(message: string, details?: unknown): ApiError {
    return new ApiError({ statusCode: 502, code: 'upstream_unavailable', message, details, retryable: true });
  }

  static internal(message = 'Internal Server Error', details?: unknown): ApiError {
    return new ApiError({ statusCode: 500, code: 'internal_error', message, details });
  }
}
