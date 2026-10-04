import { and, eq, isNull } from 'drizzle-orm';
import config from '../../config/config.js';
import { claimInvitations } from '../../chat/service.js';
import { db } from '../../db/index.js';
import {
  passwordResetTokens,
  refreshTokens,
  users,
  type User,
} from '../../db/schema.js';
import { sendPasswordResetEmail } from '../../mail/mailer.js';
import { ApiError } from '../../http/errors.js';
import { hashPassword, verifyPassword, wasteTimeLikePasswordCheck } from '../../utils/password.js';
import { generateOpaqueToken, hashToken, signAccessToken } from '../../utils/tokens.js';
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from './auth.schemas.js';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isAdmin: boolean;
  createdAt: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResult extends TokenPair {
  user: PublicUser;
}

function toPublicUser(user: User): PublicUser {
  return {
    id: String(user.id),
    name: user.name,
    email: user.email,
    role: user.role,
    isAdmin: user.isAdmin || user.role === 'admin',
    createdAt: user.createdAt.toISOString(),
  };
}

async function issueTokens(user: User): Promise<TokenPair> {
  const refreshToken = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + config.refreshTokenTtlDays * 24 * 60 * 60 * 1000);

  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    expiresAt,
  });

  return {
    accessToken: await signAccessToken({
      sub: String(user.id),
      email: user.email,
      role: user.role,
      isAdmin: user.isAdmin || user.role === 'admin',
    }),
    refreshToken,
    expiresIn: config.jwtAccessTtlSeconds,
  };
}

export async function register(input: RegisterInput): Promise<AuthResult> {
  const passwordHash = await hashPassword(input.password);

  const [user] = await db
    .insert(users)
    .values({ name: input.name, email: input.email, passwordHash })
    .onConflictDoNothing({ target: users.email })
    .returning();

  if (!user) {
    throw ApiError.conflict('An account with this email already exists');
  }

  const tokens = await issueTokens(user);
  await claimInvitations(user.id, user.email);
  return { user: toPublicUser(user), ...tokens };
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const [user] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);

  if (!user) {
    await wasteTimeLikePasswordCheck(input.password);
    throw ApiError.unauthorized('Invalid email or password');
  }

  const passwordMatches = await verifyPassword(input.password, user.passwordHash);
  if (!passwordMatches) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const tokens = await issueTokens(user);
  return { user: toPublicUser(user), ...tokens };
}

export async function refreshSession(refreshToken: string): Promise<AuthResult> {
  const [stored] = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, hashToken(refreshToken)))
    .limit(1);

  if (!stored || stored.revokedAt !== null || stored.expiresAt.getTime() <= Date.now()) {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const [rotated] = await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.id, stored.id), isNull(refreshTokens.revokedAt)))
    .returning({ id: refreshTokens.id });

  if (!rotated) {
    throw ApiError.unauthorized('Refresh token has already been used');
  }

  const [user] = await db.select().from(users).where(eq(users.id, stored.userId)).limit(1);
  if (!user) {
    throw ApiError.unauthorized('Account no longer exists');
  }

  const tokens = await issueTokens(user);
  return { user: toPublicUser(user), ...tokens };
}

export async function logout(refreshToken: string): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.tokenHash, hashToken(refreshToken)), isNull(refreshTokens.revokedAt)));
}

export async function requestPasswordReset(input: ForgotPasswordInput): Promise<void> {
  const [user] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);

  if (!user) {
    return;
  }

  const token = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + config.passwordResetTtlMinutes * 60 * 1000);

  await db.insert(passwordResetTokens).values({
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt,
  });

  const resetUrl = `${config.appBaseUrl}/reset-password?token=${encodeURIComponent(token)}`;
  await sendPasswordResetEmail(user.email, resetUrl);
}

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const now = new Date();

  const [stored] = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, hashToken(input.token)))
    .limit(1);

  if (!stored || stored.usedAt !== null || stored.expiresAt.getTime() <= now.getTime()) {
    throw ApiError.badRequest('Invalid or expired password reset token');
  }

  const passwordHash = await hashPassword(input.password);

  await db.transaction(async (tx) => {
    const [consumed] = await tx
      .update(passwordResetTokens)
      .set({ usedAt: now })
      .where(and(eq(passwordResetTokens.id, stored.id), isNull(passwordResetTokens.usedAt)))
      .returning({ id: passwordResetTokens.id });

    if (!consumed) {
      throw ApiError.badRequest('Password reset token has already been used');
    }

    await tx
      .update(users)
      .set({ passwordHash, updatedAt: now })
      .where(eq(users.id, stored.userId));

    await tx
      .update(refreshTokens)
      .set({ revokedAt: now })
      .where(and(eq(refreshTokens.userId, stored.userId), isNull(refreshTokens.revokedAt)));
  });
}

export async function getUserById(id: string): Promise<PublicUser | null> {
  const numericId = Number.parseInt(id, 10);
  if (!Number.isSafeInteger(numericId) || numericId < 1) {
    return null;
  }
  const [user] = await db.select().from(users).where(eq(users.id, numericId)).limit(1);
  return user ? toPublicUser(user) : null;
}
