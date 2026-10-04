import type { ErrorRequestHandler, RequestHandler } from 'express';
import { HttpError } from '../utils/http-error.js';
import { ApiError } from './errors.js';

interface BodyParserError extends Error {
  status?: number;
  statusCode?: number;
  type?: string;
}

function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) {
    return err;
  }

  const candidate = err as BodyParserError | undefined;
  if (candidate && (candidate.type === 'entity.parse.failed' || candidate.type === 'entity.verify.failed')) {
    return new ApiError({
      statusCode: 400,
      code: 'validation_error',
      message: 'Treść żądania nie jest poprawnym JSON-em.',
    });
  }
  if (candidate && candidate.type === 'entity.too.large') {
    return new ApiError({
      statusCode: 413,
      code: 'payload_too_large',
      message: 'Żądanie jest zbyt duże. Skróć opis problemu i spróbuj ponownie.',
    });
  }
  if (candidate && candidate.type === 'encoding.unsupported') {
    return new ApiError({
      statusCode: 415,
      code: 'unsupported_media_type',
      message: 'Nieobsługiwane kodowanie treści żądania.',
    });
  }
  // Unknown failures are logged by the caller and never leak internals.
  return new ApiError({
    statusCode: 500,
    code: 'internal_error',
    message: 'Wystąpił nieoczekiwany błąd po stronie serwera. Spróbuj ponownie później.',
    retryable: true,
  });
}

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    error: {
      code: 'not_found',
      message: 'Nie znaleziono zasobu o podanym adresie.',
      requestId: res.locals.requestId ?? 'unknown',
      retryable: false,
    },
  });
};

export function createErrorHandler(onError?: (error: unknown, requestId: string) => void): ErrorRequestHandler {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return (err, _req, res, _next) => {
    if (res.headersSent) {
      return;
    }

    const requestId = res.locals.requestId ?? 'unknown';

    // Auth/content/llm routes raise HttpError with their own code taxonomy.
    if (err instanceof HttpError) {
      if (err.status >= 500) {
        onError?.(err, requestId);
      }
      res.status(err.status).json({
        error: {
          code: err.code,
          message: err.message,
          requestId,
          ...(err.details === undefined ? {} : { details: err.details }),
        },
      });
      return;
    }

    const apiError = toApiError(err);
    if (apiError.statusCode >= 500) {
      onError?.(err, requestId);
    }
    res.status(apiError.statusCode).json({
      error: {
        code: apiError.code,
        message: apiError.message,
        requestId,
        retryable: apiError.retryable,
      },
    });
  };
}
