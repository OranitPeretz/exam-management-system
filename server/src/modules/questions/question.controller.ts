import type {
  Request,
  RequestHandler,
} from 'express';

import { AppError } from '../../errors/app-error.js';
import type { AuthenticatedActor } from '../exams/exam.service.js';
import type {
  CreateQuestionInput,
  UpdateQuestionInput,
} from './question.schemas.js';
import {
  createQuestion,
  deleteQuestion,
  listQuestionTypes,
  updateQuestion,
} from './question.service.js';

function getAuthenticatedActor(
  request: Request,
): AuthenticatedActor {
  if (!request.auth) {
    throw new AppError(
      401,
      'AUTHENTICATION_REQUIRED',
      'Authentication is required.',
    );
  }

  return request.auth;
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

export const listQuestionTypesController: RequestHandler =
  async (_request, response, next) => {
    try {
      const questionTypes = await listQuestionTypes();

      response.status(200).json({
        data: {
          questionTypes,
        },
      });
    } catch (error) {
      next(error);
    }
  };

export const createQuestionController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const actor = getAuthenticatedActor(request);
    const examId = getRequiredParameter(request, 'examId');
    const input = request.body as CreateQuestionInput;

    const question = await createQuestion(
      actor,
      examId,
      input,
    );

    response.status(201).json({
      data: {
        question,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateQuestionController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const actor = getAuthenticatedActor(request);
    const examId = getRequiredParameter(request, 'examId');
    const questionId = getRequiredParameter(
      request,
      'questionId',
    );
    const input = request.body as UpdateQuestionInput;

    const question = await updateQuestion(
      actor,
      examId,
      questionId,
      input,
    );

    response.status(200).json({
      data: {
        question,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteQuestionController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const actor = getAuthenticatedActor(request);
    const examId = getRequiredParameter(request, 'examId');
    const questionId = getRequiredParameter(
      request,
      'questionId',
    );

    await deleteQuestion(actor, examId, questionId);

    response.status(204).send();
  } catch (error) {
    next(error);
  }
};