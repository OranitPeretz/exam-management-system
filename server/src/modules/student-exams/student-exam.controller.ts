import type {
  Request,
  RequestHandler,
} from 'express';

import { AppError } from '../../errors/app-error.js';
import { listStudentExams } from './student-exam.service.js';

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

export const listStudentExamsController: RequestHandler =
  async (request, response, next) => {
    try {
      const studentId = getStudentId(request);

      const result = await listStudentExams(
        studentId,
      );

      response.status(200).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };