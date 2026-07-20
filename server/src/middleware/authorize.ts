import type { RequestHandler } from 'express';

import { AppError } from '../errors/app-error.js';
import type { UserRole } from '../generated/prisma/client.js';

export function authorize(
  ...allowedRoles: UserRole[]
): RequestHandler {
  return (request, _response, next) => {
    if (!request.auth) {
      next(
        new AppError(
          401,
          'AUTHENTICATION_REQUIRED',
          'Authentication is required.',
        ),
      );

      return;
    }

    if (!allowedRoles.includes(request.auth.role)) {
      next(
        new AppError(
          403,
          'INSUFFICIENT_PERMISSIONS',
          'You do not have permission to perform this action.',
        ),
      );

      return;
    }

    next();
  };
}