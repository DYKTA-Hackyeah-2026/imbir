import type { Request } from 'express';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { HttpError } from './http-error.js';
import { verifyAccessToken } from './tokens.js';

function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token.trim() || null;
}

async function userIdFromToken(token: string): Promise<number> {
  const payload = await verifyAccessToken(token).catch(() => {
    throw HttpError.unauthorized('Niepoprawny lub wygasły token dostępu.');
  });
  const id = Number.parseInt(payload.sub, 10);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw HttpError.unauthorized('Niepoprawny lub wygasły token dostępu.');
  }
  return id;
}

/**
 * Resolves the caller: a valid Bearer token wins, otherwise the shared demo
 * user is used so the prototype stays frictionless for anonymous visitors.
 */
export async function resolveUserId(req: Request): Promise<number> {
  const token = extractBearerToken(req.headers.authorization);
  if (token) return userIdFromToken(token);

  const [existing] = await db.select({ id: users.id }).from(users).limit(1);
  if (existing) return existing.id;

  const [created] = await db
    .insert(users)
    .values({ email: 'demo@hubmi.io', name: 'Użytkownik Demo' })
    .returning({ id: users.id });
  return created.id;
}

/** Requires a valid Bearer token and returns the authenticated user id. */
export async function requireUserId(req: Request): Promise<number> {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    throw HttpError.unauthorized('Wymagane zalogowanie.');
  }
  return userIdFromToken(token);
}
