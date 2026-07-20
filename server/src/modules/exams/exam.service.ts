import { AppError } from '../../errors/app-error.js';
import {
  EnrollmentStatus,
  ExamStatus,
  UserRole,
} from '../../generated/prisma/client.js';
import { prisma } from '../../database/prisma.js';
import type { CreateExamInput } from './exam.schemas.js';

export interface AuthenticatedActor {
  userId: string;
  role: UserRole;
}

export async function listAvailableCourses(
  actor: AuthenticatedActor,
) {
  const where =
    actor.role === UserRole.ADMIN
      ? {
          isActive: true,
        }
      : {
          isActive: true,
          lecturerId: actor.userId,
        };

  return prisma.course.findMany({
    where,
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      lecturerId: true,
      createdAt: true,
      updatedAt: true,
      lecturer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      _count: {
        select: {
          enrollments: {
            where: {
              status: EnrollmentStatus.ACTIVE,
            },
          },
          exams: true,
        },
      },
    },
    orderBy: {
      code: 'asc',
    },
  });
}

export async function listManagedExams(
  actor: AuthenticatedActor,
) {
  const where =
    actor.role === UserRole.ADMIN
      ? {}
      : {
          course: {
            lecturerId: actor.userId,
          },
        };

  return prisma.exam.findMany({
    where,
    include: {
      course: {
        select: {
          id: true,
          code: true,
          name: true,
          lecturerId: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      _count: {
        select: {
          questions: true,
          attempts: true,
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });
}

export async function createExam(
  actor: AuthenticatedActor,
  input: CreateExamInput,
) {
  const course = await prisma.course.findUnique({
    where: {
      id: input.courseId,
    },
    select: {
      id: true,
      code: true,
      name: true,
      lecturerId: true,
      isActive: true,
    },
  });

  if (!course) {
    throw new AppError(
      404,
      'COURSE_NOT_FOUND',
      'The selected course was not found.',
    );
  }

  if (!course.isActive) {
    throw new AppError(
      409,
      'COURSE_INACTIVE',
      'An exam cannot be created for an inactive course.',
    );
  }

  if (
    actor.role !== UserRole.ADMIN &&
    course.lecturerId !== actor.userId
  ) {
    throw new AppError(
      403,
      'COURSE_ACCESS_DENIED',
      'You cannot create an exam for this course.',
    );
  }

  return prisma.$transaction(async (transaction) => {
    const exam = await transaction.exam.create({
      data: {
        courseId: input.courseId,
        createdById: actor.userId,
        title: input.title,
        status: ExamStatus.DRAFT,
        ...(input.description !== undefined && {
          description: input.description,
        }),
        ...(input.instructions !== undefined && {
          instructions: input.instructions,
        }),
        ...(input.startAt !== undefined && {
          startAt:
            input.startAt === null
              ? null
              : new Date(input.startAt),
        }),
        ...(input.endAt !== undefined && {
          endAt:
            input.endAt === null
              ? null
              : new Date(input.endAt),
        }),
        ...(input.durationMinutes !== undefined && {
          durationMinutes: input.durationMinutes,
        }),
        ...(input.maxAttempts !== undefined && {
          maxAttempts: input.maxAttempts,
        }),
        ...(input.passingPercentage !== undefined && {
          passingPercentage: input.passingPercentage,
        }),
        ...(input.shuffleQuestions !== undefined && {
          shuffleQuestions: input.shuffleQuestions,
        }),
        ...(input.showFeedback !== undefined && {
          showFeedback: input.showFeedback,
        }),
      },
      include: {
        course: {
          select: {
            id: true,
            code: true,
            name: true,
            lecturerId: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            questions: true,
            attempts: true,
          },
        },
      },
    });

    await transaction.auditLog.create({
      data: {
        actorId: actor.userId,
        action: 'EXAM_CREATED',
        entityType: 'Exam',
        entityId: exam.id,
        metadata: {
          courseId: course.id,
          courseCode: course.code,
          examTitle: exam.title,
          status: exam.status,
        },
      },
    });

    return exam;
  });
}