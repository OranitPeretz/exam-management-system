import type {
  Request,
  RequestHandler,
} from 'express';

import { AppError } from '../../errors/app-error.js';
import {
  getSubmissionDetails,
  listExamSubmissions,
  type AuthenticatedSubmissionActor,
} from './submission.service.js';

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

function getRouteId(
  request: Request,
  parameterName: 'examId' | 'attemptId',
  errorCode: string,
  errorMessage: string,
): string {
  const value = request.params[parameterName];

  if (
    typeof value !== 'string' ||
    value.trim().length === 0
  ) {
    throw new AppError(
      400,
      errorCode,
      errorMessage,
    );
  }

  return value.trim();
}

export const listExamSubmissionsController: RequestHandler =
  async (request, response, next) => {
    try {
      const actor = getAuthenticatedActor(request);

      const examId = getRouteId(
        request,
        'examId',
        'EXAM_ID_REQUIRED',
        'A valid exam ID is required.',
      );

      const result = await listExamSubmissions(
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

export const getSubmissionDetailsController: RequestHandler =
  async (request, response, next) => {
    try {
      const actor = getAuthenticatedActor(request);

      const attemptId = getRouteId(
        request,
        'attemptId',
        'ATTEMPT_ID_REQUIRED',
        'A valid attempt ID is required.',
      );

      const result = await getSubmissionDetails(
        actor,
        attemptId,
      );

      response.status(200).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };