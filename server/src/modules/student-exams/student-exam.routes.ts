import { Router } from 'express';

import { UserRole } from '../../generated/prisma/client.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validateBody } from '../../middleware/validate-body.js';
import { saveStudentAnswerController } from './student-answer.controller.js';
import { saveStudentAnswerSchema } from './student-answer.schemas.js';
import { startOrResumeAttemptController } from './student-attempt.controller.js';
import { listStudentExamsController } from './student-exam.controller.js';
import { submitStudentAttemptController } from './student-submission.controller.js';
import { listStudentResultsController } from './student-result.controller.js';

export const studentExamRouter = Router();

studentExamRouter.use(
  authenticate,
  authorize(UserRole.STUDENT),
);

studentExamRouter.get(
  '/exams',
  listStudentExamsController,
);

studentExamRouter.get(
  '/results',
  listStudentResultsController,
);

studentExamRouter.post(
  '/exams/:examId/attempts',
  startOrResumeAttemptController,
);

studentExamRouter.put(
  '/attempts/:attemptId/answers/:questionId',
  validateBody(saveStudentAnswerSchema),
  saveStudentAnswerController,
);

studentExamRouter.post(
  '/attempts/:attemptId/submit',
  submitStudentAttemptController,
);