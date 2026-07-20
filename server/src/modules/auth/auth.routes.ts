import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';

import { authenticate } from '../../middleware/authenticate.js';
import { validateBody } from '../../middleware/validate-body.js';
import {
  loginController,
  logoutController,
  meController,
  refreshController,
} from './auth.controller.js';
import { loginSchema } from './auth.schemas.js';

export const authRouter = Router();

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    error: {
      code: 'TOO_MANY_LOGIN_ATTEMPTS',
      message: 'Too many login attempts. Please try again later.',
    },
  },
});

authRouter.post(
  '/login',
  loginRateLimiter,
  validateBody(loginSchema),
  loginController,
);

authRouter.post('/refresh', refreshController);
authRouter.post('/logout', logoutController);
authRouter.get('/me', authenticate, meController);