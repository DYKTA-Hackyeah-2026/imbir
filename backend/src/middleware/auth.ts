import type { RequestHandler } from 'express';
import { HttpError } from '../utils/http-error.js';
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
    next(HttpError.unauthorized('Missing or malformed Authorization header'));
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
    next(HttpError.unauthorized('Invalid or expired access token'));
  }
};

export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (!req.user) {
    next(HttpError.unauthorized('Missing or malformed Authorization header'));
    return;
  }
  if (!req.user.isAdmin && req.user.role !== 'admin') {
    next(HttpError.forbidden('Admin role required'));
    return;
  }
  next();
};
