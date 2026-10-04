import { createHash, randomBytes } from 'node:crypto';
import { jwtVerify, SignJWT } from 'jose';
import config from '../config/config.js';

const accessSecret = new TextEncoder().encode(config.jwtAccessSecret);

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
  isAdmin: boolean;
}

export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return new SignJWT({ email: payload.email, role: payload.role, isAdmin: payload.isAdmin })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(payload.sub)
    .setIssuedAt(nowSeconds)
    .setExpirationTime(nowSeconds + config.jwtAccessTtlSeconds)
    .sign(accessSecret);
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, accessSecret, { algorithms: ['HS256'] });
  if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') {
    throw new Error('Malformed access token payload');
  }
  return {
    sub: payload.sub,
    email: payload.email,
    role: typeof payload.role === 'string' ? payload.role : 'user',
    isAdmin: payload.isAdmin === true || payload.role === 'admin',
  };
}

export function generateOpaqueToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
