import type {
  Request,
  RequestHandler,
} from 'express';

import { AppError } from '../../errors/app-error.js';
import type { GradeSubmissionInput } from './grading.schemas.js';
import { gradeSubmission } from './grading.service.js';
import type { AuthenticatedSubmissionActor } from './submission.service.js';

function getAuthenticatedActor(
  request: Request,
): AuthenticatedSubmissionActor {
  if (!request.auth) {
    throw new AppError(
      401,
      'AUTHENTICATION_REQUIRED',
      'Authentication is required.',
    );
  }

  return request.auth;
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

export const gradeSubmissionController: RequestHandler =
  async (request, response, next) => {
    try {
      const actor = getAuthenticatedActor(request);
      const attemptId = getAttemptId(request);
      const input =
        request.body as GradeSubmissionInput;

      const result = await gradeSubmission(
        actor,
        attemptId,
        input,
      );

      response.status(200).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };