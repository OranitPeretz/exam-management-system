import type { RequestHandler } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';

import { env } from '../config/env.js';
import { AppError } from '../errors/app-error.js';
import { UserRole } from '../generated/prisma/client.js';
import {
  ACCESS_TOKEN_AUDIENCE,
  ACCESS_TOKEN_ISSUER,
} from '../modules/auth/auth.constants.js';

interface AccessTokenPayload extends JwtPayload {
  role?: unknown;
}

export const authenticate: RequestHandler = (
  request,
  _response,
  next,
) => {
  const authorizationHeader = request.headers.authorization;

  if (!authorizationHeader?.startsWith('Bearer ')) {
    next(
      new AppError(
        401,
        'ACCESS_TOKEN_REQUIRED',
        'An access token is required.',
      ),
    );

    return;
  }

  const accessToken = authorizationHeader.slice('Bearer '.length);

  try {
    const decoded = jwt.verify(
      accessToken,
      env.JWT_ACCESS_SECRET,
      {
        issuer: ACCESS_TOKEN_ISSUER,
        audience: ACCESS_TOKEN_AUDIENCE,
      },
    ) as AccessTokenPayload;

    const role = decoded.role;

    if (
      typeof decoded.sub !== 'string' ||
      typeof role !== 'string' ||
      !Object.values(UserRole).includes(role as UserRole)
    ) {
      throw new Error('The token payload is invalid.');
    }

    request.auth = {
      userId: decoded.sub,
      role: role as UserRole,
    };

    next();
  } catch {
    next(
      new AppError(
        401,
        'INVALID_ACCESS_TOKEN',
        'The access token is invalid or expired.',
      ),
    );
  }
};