import type { RequestHandler } from 'express';
import { ApiError } from '../http/errors.js';
import { verifyAccessToken } from '../utils/tokens.js';

function extractBearerToken(header: string | undefined): string | null {
  if (!header) {
    return null;
  }
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }
  return token.trim() || null;
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    next(ApiError.unauthorized('Missing or malformed Authorization header'));
    return;
  }

  try {
    const payload = await verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      isAdmin: payload.isAdmin,
    };
    next();
  } catch {
    next(ApiError.unauthorized('Invalid or expired access token'));
  }
};

export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (!req.user) {
    next(ApiError.unauthorized('Missing or malformed Authorization header'));
    return;
  }
  if (!req.user.isAdmin && req.user.role !== 'admin') {
    next(ApiError.forbidden('Admin role required'));
    return;
  }
  next();
};
