import type {
  Request,
  RequestHandler,
} from 'express';

import { AppError } from '../../errors/app-error.js';
import { startOrResumeStudentAttempt } from './student-attempt.service.js';

function getStudentId(request: Request): string {
  if (!request.auth) {
    throw new AppError(
      401,
      'AUTHENTICATION_REQUIRED',
      'Authentication is required.',
    );
  }

  return request.auth.userId;
}

function getExamId(request: Request): string {
  const examId = request.params.examId;

  if (
    typeof examId !== 'string' ||
    examId.trim().length === 0
  ) {
    throw new AppError(
      400,
      'EXAM_ID_REQUIRED',
      'A valid exam ID is required.',
    );
  }

  return examId.trim();
}

export const startOrResumeAttemptController: RequestHandler =
  async (request, response, next) => {
    try {
      const studentId = getStudentId(request);
      const examId = getExamId(request);

      const result =
        await startOrResumeStudentAttempt(
          studentId,
          examId,
        );

      response
        .status(result.resumed ? 200 : 201)
        .json({
          data: result,
        });
    } catch (error) {
      next(error);
    }
  };