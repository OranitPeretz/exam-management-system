import { createHash, randomBytes } from 'node:crypto';

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { env } from '../../config/env.js';
import { prisma } from '../../database/prisma.js';
import { AppError } from '../../errors/app-error.js';
import type { UserRole } from '../../generated/prisma/client.js';
import {
  ACCESS_TOKEN_AUDIENCE,
  ACCESS_TOKEN_ISSUER,
} from './auth.constants.js';

export interface PublicUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

interface AuthenticationResult {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

function toPublicUser(user: PublicUser): PublicUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
  };
}

function createAccessToken(user: {
  id: string;
  role: UserRole;
}): string {
  return jwt.sign(
    {
      role: user.role,
    },
    env.JWT_ACCESS_SECRET,
    {
      subject: user.id,
      issuer: ACCESS_TOKEN_ISSUER,
      audience: ACCESS_TOKEN_AUDIENCE,
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    },
  );
}

function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function generateRefreshToken(): {
  token: string;
  tokenHash: string;
  expiresAt: Date;
} {
  const token = randomBytes(64).toString('hex');
  const tokenHash = hashRefreshToken(token);
  const expiresAt = new Date(
    Date.now() +
      env.REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
  );

  return {
    token,
    tokenHash,
    expiresAt,
  };
}

export async function login(
  email: string,
  password: string,
  ipAddress?: string,
): Promise<AuthenticationResult> {
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user || !user.isActive) {
    throw new AppError(
      401,
      'INVALID_CREDENTIALS',
      'The email or password is incorrect.',
    );
  }

  const passwordIsValid = await bcrypt.compare(
    password,
    user.passwordHash,
  );

  if (!passwordIsValid) {
    throw new AppError(
      401,
      'INVALID_CREDENTIALS',
      'The email or password is incorrect.',
    );
  }

  await prisma.refreshToken.deleteMany({
    where: {
      userId: user.id,
      OR: [
        {
          expiresAt: {
            lt: new Date(),
          },
        },
        {
          revokedAt: {
            not: null,
          },
        },
      ],
    },
  });

  const refreshToken = generateRefreshToken();

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refreshToken.tokenHash,
      expiresAt: refreshToken.expiresAt,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: user.id,
      ipAddress: ipAddress ?? null,
      metadata: {
        email: user.email,
        role: user.role,
      },
    },
  });

  return {
    user: toPublicUser(user),
    accessToken: createAccessToken(user),
    refreshToken: refreshToken.token,
    refreshTokenExpiresAt: refreshToken.expiresAt,
  };
}

export async function refreshSession(
  rawRefreshToken: string,
): Promise<AuthenticationResult> {
  const currentTokenHash = hashRefreshToken(rawRefreshToken);

  const currentToken = await prisma.refreshToken.findUnique({
    where: {
      tokenHash: currentTokenHash,
    },
    include: {
      user: true,
    },
  });

  if (
    !currentToken ||
    currentToken.revokedAt ||
    currentToken.expiresAt <= new Date() ||
    !currentToken.user.isActive
  ) {
    throw new AppError(
      401,
      'INVALID_REFRESH_TOKEN',
      'The session is invalid or expired.',
    );
  }

  const nextRefreshToken = generateRefreshToken();

  await prisma.$transaction([
    prisma.refreshToken.update({
      where: {
        id: currentToken.id,
      },
      data: {
        revokedAt: new Date(),
      },
    }),
    prisma.refreshToken.create({
      data: {
        userId: currentToken.user.id,
        tokenHash: nextRefreshToken.tokenHash,
        expiresAt: nextRefreshToken.expiresAt,
      },
    }),
  ]);

  return {
    user: toPublicUser(currentToken.user),
    accessToken: createAccessToken(currentToken.user),
    refreshToken: nextRefreshToken.token,
    refreshTokenExpiresAt: nextRefreshToken.expiresAt,
  };
}

export async function logout(
  rawRefreshToken: string | undefined,
): Promise<void> {
  if (!rawRefreshToken) {
    return;
  }

  const tokenHash = hashRefreshToken(rawRefreshToken);

  await prisma.refreshToken.updateMany({
    where: {
      tokenHash,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

export async function getCurrentUser(
  userId: string,
): Promise<PublicUser> {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) {
    throw new AppError(
      401,
      'USER_NOT_AVAILABLE',
      'The authenticated user is unavailable.',
    );
  }

  return toPublicUser(user);
}