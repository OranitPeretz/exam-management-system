import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';

import { UserRole } from '../../generated/prisma/client.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validateBody } from '../../middleware/validate-body.js';
import {
  createManagedUserController,
  listManagedUsersController,
} from './admin-user.controller.js';
import {
  createAdminUserSchema,
} from './admin-user.schemas.js';

export const adminRouter = Router();

const userCreationRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'TOO_MANY_USER_CREATION_REQUESTS',
      message:
        'Too many user creation requests. Please try again later.',
    },
  },
});

adminRouter.use(
  authenticate,
  authorize(UserRole.ADMIN),
);

adminRouter
  .route('/users')
  .get(listManagedUsersController)
  .post(
    userCreationRateLimiter,
    validateBody(createAdminUserSchema),
    createManagedUserController,
  );