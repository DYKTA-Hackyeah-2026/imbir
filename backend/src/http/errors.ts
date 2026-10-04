/**
 * Error taxonomy shared by every endpoint. `message` is always safe to show
 * to an end user and is written in plain Polish.
 */
export const ERROR_CODES = [
  'validation_error',
  'not_found',
  'unsupported_media_type',
  'payload_too_large',
  'unprocessable_entity',
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

  static validation(message: string, details?: unknown): ApiError {
    return new ApiError({ statusCode: 400, code: 'validation_error', message, details });
  }

  static notFound(message: string): ApiError {
    return new ApiError({ statusCode: 404, code: 'not_found', message });
  }

  static degraded(message: string): ApiError {
    return new ApiError({ statusCode: 200, code: 'service_degraded', message, retryable: true });
  }
}
