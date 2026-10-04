import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { authRateLimiter, sensitiveRateLimiter } from '../../middleware/rate-limit.js';
import { validateBody } from '../../middleware/validate.js';
import * as controller from './auth.controller.js';
import {
  forgotPasswordSchema,
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  resetPasswordSchema,
} from './auth.schemas.js';

const authRouter = Router();

authRouter.post('/register', authRateLimiter, validateBody(registerSchema), controller.register);
authRouter.post('/login', sensitiveRateLimiter, validateBody(loginSchema), controller.login);
authRouter.post('/refresh', authRateLimiter, validateBody(refreshTokenSchema), controller.refresh);
authRouter.post('/logout', authRateLimiter, validateBody(refreshTokenSchema), controller.logout);
authRouter.post(
  '/forgot-password',
  sensitiveRateLimiter,
  validateBody(forgotPasswordSchema),
  controller.forgotPassword,
);
authRouter.post(
  '/reset-password',
  sensitiveRateLimiter,
  validateBody(resetPasswordSchema),
  controller.resetPassword,
);
authRouter.get('/me', requireAuth, controller.me);

export default authRouter;
