import type {
  Request,
  RequestHandler,
} from 'express';

import { AppError } from '../../errors/app-error.js';
import { publishExamResults } from './results-publication.service.js';
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

export const publishExamResultsController: RequestHandler =
  async (request, response, next) => {
    try {
      const actor = getAuthenticatedActor(request);
      const examId = getExamId(request);

      const result = await publishExamResults(
        actor,
        examId,
      );

      response.status(200).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };