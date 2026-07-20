import type {
  Request,
  RequestHandler,
} from 'express';

import { AppError } from '../../errors/app-error.js';
import type { CreateExamInput } from './exam.schemas.js';
import {
  createExam,
  listAvailableCourses,
  listManagedExams,
  type AuthenticatedActor,
} from './exam.service.js';

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

export const listAvailableCoursesController: RequestHandler =
  async (request, response, next) => {
    try {
      const actor = getAuthenticatedActor(request);
      const courses = await listAvailableCourses(actor);

      response.status(200).json({
        data: {
          courses,
        },
      });
    } catch (error) {
      next(error);
    }
  };

export const listManagedExamsController: RequestHandler =
  async (request, response, next) => {
    try {
      const actor = getAuthenticatedActor(request);
      const exams = await listManagedExams(actor);

      response.status(200).json({
        data: {
          exams,
        },
      });
    } catch (error) {
      next(error);
    }
  };

export const createExamController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const actor = getAuthenticatedActor(request);
    const input = request.body as CreateExamInput;
    const exam = await createExam(actor, input);

    response.status(201).json({
      data: {
        exam,
      },
    });
  } catch (error) {
    next(error);
  }
};