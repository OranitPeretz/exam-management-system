import type {
  Request,
  RequestHandler,
} from 'express';

import { AppError } from '../../errors/app-error.js';
import { submitStudentAttempt } from './student-submission.service.js';

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

function getAttemptId(request: Request): string {
  const attemptId = request.params.attemptId;

  if (
    typeof attemptId !== 'string' ||
    attemptId.trim().length === 0
  ) {
    throw new AppError(
      400,
      'ATTEMPT_ID_REQUIRED',
      'A valid attempt ID is required.',
    );
  }

  return attemptId.trim();
}

export const submitStudentAttemptController: RequestHandler =
  async (request, response, next) => {
    try {
      const studentId = getStudentId(request);
      const attemptId = getAttemptId(request);

      const result = await submitStudentAttempt(
        studentId,
        attemptId,
      );

      response.status(200).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };