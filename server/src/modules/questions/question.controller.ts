import type {
  Request,
  RequestHandler,
} from 'express';

import { AppError } from '../../errors/app-error.js';
import type { AuthenticatedActor } from '../exams/exam.service.js';
import type { CreateQuestionInput } from './question.schemas.js';
import {
  createQuestion,
  listQuestionTypes,
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
    const examId = getExamId(request);
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