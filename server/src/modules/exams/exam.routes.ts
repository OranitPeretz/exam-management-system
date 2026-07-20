import { Router } from 'express';

import { UserRole } from '../../generated/prisma/client.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validateBody } from '../../middleware/validate-body.js';
import {
  createQuestionController,
  listQuestionTypesController,
} from '../questions/question.controller.js';
import { createQuestionSchema } from '../questions/question.schemas.js';
import {
  createExamController,
  deleteManagedExamController,
  getManagedExamController,
  listAvailableCoursesController,
  listManagedExamsController,
  updateManagedExamController,
} from './exam.controller.js';
import {
  createExamSchema,
  updateExamSchema,
} from './exam.schemas.js';

export const lecturerExamRouter = Router();

lecturerExamRouter.use(
  authenticate,
  authorize(UserRole.LECTURER, UserRole.ADMIN),
);

lecturerExamRouter.get(
  '/courses',
  listAvailableCoursesController,
);

lecturerExamRouter.get(
  '/question-types',
  listQuestionTypesController,
);

lecturerExamRouter
  .route('/exams')
  .get(listManagedExamsController)
  .post(
    validateBody(createExamSchema),
    createExamController,
  );

lecturerExamRouter
  .route('/exams/:examId')
  .get(getManagedExamController)
  .patch(
    validateBody(updateExamSchema),
    updateManagedExamController,
  )
  .delete(deleteManagedExamController);

lecturerExamRouter.post(
  '/exams/:examId/questions',
  validateBody(createQuestionSchema),
  createQuestionController,
);