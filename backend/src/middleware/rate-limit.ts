import type { Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import config from '../config/config.js';

function tooManyRequests(_req: unknown, res: Response): void {
  res.status(429).json({
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests, please try again later.',
    },
  });
}

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.isTest,
  handler: tooManyRequests,
});

export const sensitiveRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: () => config.isTest,
  handler: tooManyRequests,
});
