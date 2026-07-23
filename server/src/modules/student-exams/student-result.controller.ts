import type { RequestHandler } from 'express';

import { AppError } from '../../errors/app-error.js';
import { listStudentResults } from './student-result.service.js';

export const listStudentResultsController: RequestHandler =
  async (request, response, next) => {
    try {
      if (!request.auth) {
        throw new AppError(
          401,
          'AUTHENTICATION_REQUIRED',
          'Authentication is required.',
        );
      }

      const results = await listStudentResults(
        request.auth.userId,
      );

      response.status(200).json({
        data: {
          results,
        },
      });
    } catch (error) {
      next(error);
    }
  };