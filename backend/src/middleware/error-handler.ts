import type { ErrorRequestHandler, RequestHandler } from 'express';
import config from '../config/config.js';
import { HttpError } from '../utils/http-error.js';

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not Found' } });
};

interface JsonBodyParseError extends Error {
  status?: number;
  statusCode?: number;
  type?: string;
}

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (res.headersSent) {
    return;
  }

  if (error instanceof HttpError) {
    res.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
      },
    });
    return;
  }

  const candidate = error as JsonBodyParseError;

  if (error instanceof SyntaxError && 'body' in candidate) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Malformed JSON body' } });
    return;
  }

  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[error] ${message}\n`);

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: config.isProduction ? 'Internal Server Error' : message,
    },
  });
};
