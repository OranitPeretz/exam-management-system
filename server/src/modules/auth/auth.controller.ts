import type {
  CookieOptions,
  RequestHandler,
} from 'express';

import { env } from '../../config/env.js';
import { AppError } from '../../errors/app-error.js';
import { REFRESH_COOKIE_PATH } from './auth.constants.js';
import type { LoginInput } from './auth.schemas.js';
import {
  getCurrentUser,
  login,
  logout,
  refreshSession,
} from './auth.service.js';

function getRefreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite:
      env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: REFRESH_COOKIE_PATH,
  };
}

export const loginController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const credentials = request.body as LoginInput;

    const result = await login(
      credentials.email,
      credentials.password,
      request.ip,
    );

    response.cookie(
      env.REFRESH_COOKIE_NAME,
      result.refreshToken,
      {
        ...getRefreshCookieOptions(),
        expires: result.refreshTokenExpiresAt,
      },
    );

    response.status(200).json({
      data: {
        user: result.user,
        accessToken: result.accessToken,
        accessTokenExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refreshController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const refreshToken = request.cookies?.[
      env.REFRESH_COOKIE_NAME
    ] as string | undefined;

    if (!refreshToken) {
      throw new AppError(
        401,
        'REFRESH_TOKEN_REQUIRED',
        'A refresh token is required.',
      );
    }

    const result = await refreshSession(refreshToken);

    response.cookie(
      env.REFRESH_COOKIE_NAME,
      result.refreshToken,
      {
        ...getRefreshCookieOptions(),
        expires: result.refreshTokenExpiresAt,
      },
    );

    response.status(200).json({
      data: {
        user: result.user,
        accessToken: result.accessToken,
        accessTokenExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logoutController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const refreshToken = request.cookies?.[
      env.REFRESH_COOKIE_NAME
    ] as string | undefined;

    await logout(refreshToken);

    response.clearCookie(
      env.REFRESH_COOKIE_NAME,
      getRefreshCookieOptions(),
    );

    response.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const meController: RequestHandler = async (
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

    const user = await getCurrentUser(request.auth.userId);

    response.status(200).json({
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};