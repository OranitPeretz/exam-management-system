import type {
  Request,
  RequestHandler,
} from 'express';

import { AppError } from '../../errors/app-error.js';
import type {
  CreateExamInput,
  UpdateExamInput,
} from './exam.schemas.js';
import {
  createExam,
  deleteManagedExam,
  getManagedExamDetails,
  listAvailableCourses,
  listManagedExams,
  updateManagedExam,
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

export const getManagedExamController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const actor = getAuthenticatedActor(request);
    const examId = getExamId(request);

    const exam = await getManagedExamDetails(
      actor,
      examId,
    );

    response.status(200).json({
      data: {
        exam,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateManagedExamController: RequestHandler =
  async (request, response, next) => {
    try {
      const actor = getAuthenticatedActor(request);
      const examId = getExamId(request);
      const input = request.body as UpdateExamInput;

      const exam = await updateManagedExam(
        actor,
        examId,
        input,
      );

      response.status(200).json({
        data: {
          exam,
        },
      });
    } catch (error) {
      next(error);
    }
  };

export const deleteManagedExamController: RequestHandler =
  async (request, response, next) => {
    try {
      const actor = getAuthenticatedActor(request);
      const examId = getExamId(request);

      await deleteManagedExam(actor, examId);

      response.status(204).send();
    } catch (error) {
      next(error);
    }
  };