import type {
  Request,
  RequestHandler,
} from 'express';

import { AppError } from '../../errors/app-error.js';
import type { SaveStudentAnswerInput } from './student-answer.schemas.js';
import { saveStudentAnswer } from './student-answer.service.js';

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

function getRequiredParameter(
  request: Request,
  parameterName: string,
): string {
  const value = request.params[parameterName];

  if (
    typeof value !== 'string' ||
    value.trim().length === 0
  ) {
    throw new AppError(
      400,
      'ROUTE_PARAMETER_REQUIRED',
      `A valid ${parameterName} is required.`,
    );
  }

  return value.trim();
}

export const saveStudentAnswerController: RequestHandler =
  async (request, response, next) => {
    try {
      const studentId = getStudentId(request);

      const attemptId = getRequiredParameter(
        request,
        'attemptId',
      );

      const questionId = getRequiredParameter(
        request,
        'questionId',
      );

      const input =
        request.body as SaveStudentAnswerInput;

      const result = await saveStudentAnswer(
        studentId,
        attemptId,
        questionId,
        input,
      );

      response.status(200).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };