import { prisma } from '../../database/prisma.js';
import { AppError } from '../../errors/app-error.js';
import {
  EnrollmentStatus,
  ExamStatus,
  UserRole,
} from '../../generated/prisma/client.js';
import type {
  CreateExamInput,
  UpdateExamInput,
} from './exam.schemas.js';

export interface AuthenticatedActor {
  userId: string;
  role: UserRole;
}

interface ManageableExam {
  course: {
    lecturerId: string;
  };
}

function assertCanManageExam(
  actor: AuthenticatedActor,
  exam: ManageableExam,
): void {
  if (
    actor.role !== UserRole.ADMIN &&
    exam.course.lecturerId !== actor.userId
  ) {
    throw new AppError(
      403,
      'EXAM_ACCESS_DENIED',
      'You cannot manage this exam.',
    );
  }
}

function assertExamIsDraft(status: ExamStatus): void {
  if (status !== ExamStatus.DRAFT) {
    throw new AppError(
      409,
      'EXAM_NOT_EDITABLE',
      'Only draft exams can be changed.',
    );
  }
}

async function findExamForMutation(
  actor: AuthenticatedActor,
  examId: string,
) {
  const exam = await prisma.exam.findUnique({
    where: {
      id: examId,
    },
    select: {
      id: true,
      courseId: true,
      title: true,
      status: true,
      startAt: true,
      endAt: true,
      version: true,
      course: {
        select: {
          lecturerId: true,
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

  if (!exam) {
    throw new AppError(
      404,
      'EXAM_NOT_FOUND',
      'The requested exam was not found.',
    );
  }

  assertCanManageExam(actor, exam);

  return exam;
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

export async function getManagedExamDetails(
  actor: AuthenticatedActor,
  examId: string,
) {
  const exam = await prisma.exam.findUnique({
    where: {
      id: examId,
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
      questions: {
        orderBy: {
          position: 'asc',
        },
        include: {
          type: {
            select: {
              id: true,
              code: true,
              name: true,
              isAutoGradable: true,
            },
          },
          options: {
            orderBy: {
              position: 'asc',
            },
          },
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

  if (!exam) {
    throw new AppError(
      404,
      'EXAM_NOT_FOUND',
      'The requested exam was not found.',
    );
  }

  assertCanManageExam(actor, exam);

  return exam;
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

export async function updateManagedExam(
  actor: AuthenticatedActor,
  examId: string,
  input: UpdateExamInput,
) {
  const existingExam = await findExamForMutation(
    actor,
    examId,
  );

  assertExamIsDraft(existingExam.status);

  const nextStartAt =
    input.startAt === undefined
      ? existingExam.startAt
      : input.startAt === null
        ? null
        : new Date(input.startAt);

  const nextEndAt =
    input.endAt === undefined
      ? existingExam.endAt
      : input.endAt === null
        ? null
        : new Date(input.endAt);

  if (
    nextStartAt &&
    nextEndAt &&
    nextEndAt.getTime() <= nextStartAt.getTime()
  ) {
    throw new AppError(
      422,
      'INVALID_EXAM_SCHEDULE',
      'End time must be later than start time.',
    );
  }

  await prisma.$transaction(async (transaction) => {
    const updateResult = await transaction.exam.updateMany({
      where: {
        id: existingExam.id,
        status: ExamStatus.DRAFT,
        version: existingExam.version,
      },
      data: {
        ...(input.title !== undefined && {
          title: input.title,
        }),
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
        version: {
          increment: 1,
        },
      },
    });

    if (updateResult.count !== 1) {
      throw new AppError(
        409,
        'EXAM_UPDATE_CONFLICT',
        'The exam was changed by another request. Reload and try again.',
      );
    }

    await transaction.auditLog.create({
      data: {
        actorId: actor.userId,
        action: 'EXAM_UPDATED',
        entityType: 'Exam',
        entityId: existingExam.id,
        metadata: {
          changedFields: Object.keys(input),
          previousVersion: existingExam.version,
          newVersion: existingExam.version + 1,
        },
      },
    });
  });

  return getManagedExamDetails(actor, examId);
}

export async function deleteManagedExam(
  actor: AuthenticatedActor,
  examId: string,
): Promise<void> {
  const existingExam = await findExamForMutation(
    actor,
    examId,
  );

  assertExamIsDraft(existingExam.status);

  if (existingExam._count.attempts > 0) {
    throw new AppError(
      409,
      'EXAM_HAS_ATTEMPTS',
      'An exam with student attempts cannot be deleted.',
    );
  }

  await prisma.$transaction(async (transaction) => {
    const deleteResult = await transaction.exam.deleteMany({
      where: {
        id: existingExam.id,
        status: ExamStatus.DRAFT,
        version: existingExam.version,
      },
    });

    if (deleteResult.count !== 1) {
      throw new AppError(
        409,
        'EXAM_DELETE_CONFLICT',
        'The exam was changed by another request. Reload and try again.',
      );
    }

    await transaction.auditLog.create({
      data: {
        actorId: actor.userId,
        action: 'EXAM_DELETED',
        entityType: 'Exam',
        entityId: existingExam.id,
        metadata: {
          examTitle: existingExam.title,
          courseId: existingExam.courseId,
        },
      },
    });
  });
}