import type {
  RequestHandler,
} from 'express';

import { AppError } from '../../errors/app-error.js';
import {
  listAdminUsersQuerySchema,
  type CreateAdminUserInput,
} from './admin-user.schemas.js';
import {
  createManagedUser,
  listManagedUsers,
} from './admin-user.service.js';

export const listManagedUsersController:
  RequestHandler = async (
    request,
    response,
    next,
  ) => {
    try {
      const queryResult =
        listAdminUsersQuerySchema.safeParse(
          request.query,
        );

      if (!queryResult.success) {
        throw new AppError(
          400,
          'INVALID_QUERY_PARAMETERS',
          'The user filters are invalid.',
          queryResult.error.issues,
        );
      }

      const result =
        await listManagedUsers(
          queryResult.data,
        );

      response.status(200).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

export const createManagedUserController:
  RequestHandler = async (
    request,
    response,
    next,
  ) => {
    try {
      if (!request.auth) {
        throw new AppError(
          401,
          'AUTHENTICATION_REQUIRED',
          'Authentication is required.',
        );
      }

      const input =
        request.body as CreateAdminUserInput;

      const user = await createManagedUser(
        input,
        request.auth.userId,
        request.ip,
      );

      response.status(201).json({
        data: {
          user,
        },
      });
    } catch (error) {
      next(error);
    }
  };