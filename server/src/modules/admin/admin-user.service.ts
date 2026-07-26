import bcrypt from 'bcryptjs';

import { prisma } from '../../database/prisma.js';
import { AppError } from '../../errors/app-error.js';
import type {
  UserRole,
} from '../../generated/prisma/client.js';
import type {
  CreateAdminUserInput,
  ListAdminUsersQuery,
} from './admin-user.schemas.js';

export interface ManagedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    enrollments: number;
    coursesTaught: number;
  };
}

export interface ManagedUsersResult {
  users: ManagedUser[];
  total: number;
}

export async function listManagedUsers(
  query: ListAdminUsersQuery,
): Promise<ManagedUsersResult> {
  const search =
    query.search?.trim() || undefined;

  const where = {
    ...(query.role
      ? {
          role: query.role,
        }
      : {}),

    ...(typeof query.isActive ===
    'boolean'
      ? {
          isActive: query.isActive,
        }
      : {}),

    ...(search
      ? {
          OR: [
            {
              email: {
                contains: search,
                mode: 'insensitive' as const,
              },
            },
            {
              firstName: {
                contains: search,
                mode: 'insensitive' as const,
              },
            },
            {
              lastName: {
                contains: search,
                mode: 'insensitive' as const,
              },
            },
          ],
        }
      : {}),
  };

  const [
    users,
    total,
  ] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            enrollments: true,
            coursesTaught: true,
          },
        },
      },
      orderBy: [
        {
          role: 'asc',
        },
        {
          lastName: 'asc',
        },
        {
          firstName: 'asc',
        },
      ],
    }),

    prisma.user.count({
      where,
    }),
  ]);

  return {
    users,
    total,
  };
}

export async function createManagedUser(
  input: CreateAdminUserInput,
  adminId: string,
  ipAddress?: string,
): Promise<ManagedUser> {
  const existingUser =
    await prisma.user.findUnique({
      where: {
        email: input.email,
      },
      select: {
        id: true,
      },
    });

  if (existingUser) {
    throw new AppError(
      409,
      'EMAIL_ALREADY_EXISTS',
      'A user with this email address already exists.',
    );
  }

  const passwordHash = await bcrypt.hash(
    input.password,
    12,
  );

  try {
    return await prisma.$transaction(
      async (transaction) => {
        const user =
          await transaction.user.create({
            data: {
              email: input.email,
              passwordHash,
              firstName: input.firstName,
              lastName: input.lastName,
              role: input.role,
              isActive: true,
            },
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
              isActive: true,
              createdAt: true,
              updatedAt: true,
              _count: {
                select: {
                  enrollments: true,
                  coursesTaught: true,
                },
              },
            },
          });

        await transaction.auditLog.create({
          data: {
            actorId: adminId,
            action: 'USER_CREATED',
            entityType: 'User',
            entityId: user.id,
            ipAddress: ipAddress ?? null,
            metadata: {
              email: user.email,
              role: user.role,
            },
          },
        });

        return user;
      },
    );
  } catch (error) {
    const duplicateUser =
      await prisma.user.findUnique({
        where: {
          email: input.email,
        },
        select: {
          id: true,
        },
      });

    if (duplicateUser) {
      throw new AppError(
        409,
        'EMAIL_ALREADY_EXISTS',
        'A user with this email address already exists.',
      );
    }

    throw error;
  }
}
export async function updateManagedUserStatus(
  userId: string,
  isActive: boolean,
  adminId: string,
  ipAddress?: string,
): Promise<ManagedUser> {
  const existingUser =
    await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

  if (!existingUser) {
    throw new AppError(
      404,
      'USER_NOT_FOUND',
      'The selected user was not found.',
    );
  }

  if (
    existingUser.id === adminId &&
    !isActive
  ) {
    throw new AppError(
      409,
      'CANNOT_DEACTIVATE_CURRENT_ADMIN',
      'You cannot deactivate your own administrator account.',
    );
  }

  if (existingUser.isActive === isActive) {
    const unchangedUser =
      await prisma.user.findUnique({
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
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              enrollments: true,
              coursesTaught: true,
            },
          },
        },
      });

    if (!unchangedUser) {
      throw new AppError(
        404,
        'USER_NOT_FOUND',
        'The selected user was not found.',
      );
    }

    return unchangedUser;
  }

  return prisma.$transaction(
    async (transaction) => {
      const user =
        await transaction.user.update({
          where: {
            id: userId,
          },
          data: {
            isActive,
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                enrollments: true,
                coursesTaught: true,
              },
            },
          },
        });

      if (!isActive) {
        await transaction.refreshToken.updateMany({
          where: {
            userId,
            revokedAt: null,
          },
          data: {
            revokedAt: new Date(),
          },
        });
      }

      await transaction.auditLog.create({
        data: {
          actorId: adminId,
          action: isActive
            ? 'USER_REACTIVATED'
            : 'USER_DEACTIVATED',
          entityType: 'User',
          entityId: user.id,
          ipAddress: ipAddress ?? null,
          metadata: {
            email: user.email,
            role: user.role,
            isActive: user.isActive,
          },
        },
      });

      return user;
    },
  );
}