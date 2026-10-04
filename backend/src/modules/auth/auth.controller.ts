import type { RequestHandler } from 'express';
import { ApiError } from '../../http/errors.js';
import type {
  ForgotPasswordInput,
  LoginInput,
  RefreshTokenInput,
  RegisterInput,
  ResetPasswordInput,
} from './auth.schemas.js';
import * as authService from './auth.service.js';

export const register: RequestHandler = async (req, res) => {
  const result = await authService.register(req.body as RegisterInput);
  res.status(201).json(result);
};

export const login: RequestHandler = async (req, res) => {
  const result = await authService.login(req.body as LoginInput);
  res.json(result);
};

export const refresh: RequestHandler = async (req, res) => {
  const { refreshToken } = req.body as RefreshTokenInput;
  const result = await authService.refreshSession(refreshToken);
  res.json(result);
};

export const logout: RequestHandler = async (req, res) => {
  const { refreshToken } = req.body as RefreshTokenInput;
  await authService.logout(refreshToken);
  res.status(204).end();
};

export const forgotPassword: RequestHandler = async (req, res) => {
  await authService.requestPasswordReset(req.body as ForgotPasswordInput);
  res.status(202).json({
    message: 'If an account with that email exists, a password reset link has been sent.',
  });
};

export const resetPassword: RequestHandler = async (req, res) => {
  await authService.resetPassword(req.body as ResetPasswordInput);
  res.status(204).end();
};

export const me: RequestHandler = async (req, res) => {
  const user = await authService.getUserById(req.user!.id);
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  res.json({ user });
};
