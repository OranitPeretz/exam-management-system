import { Router } from 'express';

import { UserRole } from '../../generated/prisma/client.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validateBody } from '../../middleware/validate-body.js';
import {
  createExamController,
  listAvailableCoursesController,
  listManagedExamsController,
} from './exam.controller.js';
import { createExamSchema } from './exam.schemas.js';

export const lecturerExamRouter = Router();

lecturerExamRouter.use(
  authenticate,
  authorize(UserRole.LECTURER, UserRole.ADMIN),
);

lecturerExamRouter.get(
  '/courses',
  listAvailableCoursesController,
);

lecturerExamRouter
  .route('/exams')
  .get(listManagedExamsController)
  .post(
    validateBody(createExamSchema),
    createExamController,
  );