import { prisma } from '../../database/prisma.js';
import { AppError } from '../../errors/app-error.js';
import {
  AttemptStatus,
  ExamStatus,
  NotificationType,
  Prisma,
  UserRole,
} from '../../generated/prisma/client.js';
import type { AuthenticatedSubmissionActor } from './submission.service.js';

function isTransactionConflict(error: unknown): boolean {
  return (
    error instanceof
      Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2034'
  );
}

export async function publishExamResults(
  actor: AuthenticatedSubmissionActor,
  examId: string,
) {
  const exam = await prisma.exam.findUnique({
    where: {
      id: examId,
    },
    select: {
      id: true,
      title: true,
      status: true,
      version: true,
      course: {
        select: {
          lecturerId: true,
        },
      },
      attempts: {
        select: {
          id: true,
          studentId: true,
          status: true,
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

  if (
    actor.role !== UserRole.ADMIN &&
    exam.course.lecturerId !== actor.userId
  ) {
    throw new AppError(
      403,
      'RESULTS_PUBLICATION_ACCESS_DENIED',
      'You cannot publish results for this exam.',
    );
  }

  if (exam.status === ExamStatus.RESULTS_PUBLISHED) {
    throw new AppError(
      409,
      'RESULTS_ALREADY_PUBLISHED',
      'Results have already been published.',
    );
  }

  if (
    exam.status === ExamStatus.DRAFT ||
    exam.status === ExamStatus.ARCHIVED
  ) {
    throw new AppError(
      409,
      'EXAM_RESULTS_NOT_PUBLISHABLE',
      'Results cannot be published for this exam.',
    );
  }

  if (exam.attempts.length === 0) {
    throw new AppError(
      409,
      'NO_EXAM_SUBMISSIONS',
      'Results cannot be published before students submit the exam.',
    );
  }

  const ungradedAttempts = exam.attempts.filter(
    (attempt) =>
      attempt.status !== AttemptStatus.GRADED,
  );

  if (ungradedAttempts.length > 0) {
    throw new AppError(
      409,
      'UNFINISHED_GRADING',
      'All exam submissions must be graded before results publication.',
      {
        ungradedAttempts:
          ungradedAttempts.length,
        attemptIds: ungradedAttempts.map(
          (attempt) => attempt.id,
        ),
      },
    );
  }

  const studentIds = [
    ...new Set(
      exam.attempts.map(
        (attempt) => attempt.studentId,
      ),
    ),
  ];

  const publishedAt = new Date();

  try {
    await prisma.$transaction(
      async (transaction) => {
        const updateResult =
          await transaction.exam.updateMany({
            where: {
              id: exam.id,
              version: exam.version,
              status: {
                in: [
                  ExamStatus.PUBLISHED,
                  ExamStatus.CLOSED,
                  ExamStatus.GRADING,
                ],
              },
            },
            data: {
              status:
                ExamStatus.RESULTS_PUBLISHED,
              resultsPublishedAt: publishedAt,
              version: {
                increment: 1,
              },
            },
          });

        if (updateResult.count !== 1) {
          throw new AppError(
            409,
            'RESULTS_PUBLICATION_CONFLICT',
            'The exam was changed. Reload it before publishing results.',
          );
        }

        await transaction.notification.createMany({
          data: studentIds.map((studentId) => ({
            userId: studentId,
            type: NotificationType.RESULTS_PUBLISHED,
            title: 'Exam results published',
            message: `Results for ${exam.title} are now available.`,
            metadata: {
              examId: exam.id,
            },
          })),
        });

        await transaction.auditLog.create({
          data: {
            actorId: actor.userId,
            action:
              'EXAM_RESULTS_PUBLISHED',
            entityType: 'Exam',
            entityId: exam.id,
            metadata: {
              examTitle: exam.title,
              gradedAttempts:
                exam.attempts.length,
              notifiedStudents:
                studentIds.length,
              previousStatus: exam.status,
              newStatus:
                ExamStatus.RESULTS_PUBLISHED,
              previousVersion: exam.version,
              newVersion: exam.version + 1,
              publishedAt:
                publishedAt.toISOString(),
            },
          },
        });
      },
      {
        isolationLevel:
          Prisma.TransactionIsolationLevel
            .Serializable,
      },
    );
  } catch (error) {
    if (isTransactionConflict(error)) {
      throw new AppError(
        409,
        'RESULTS_PUBLICATION_CONFLICT',
        'Another request changed the exam. Reload it and try again.',
      );
    }

    throw error;
  }

  return {
    exam: {
      id: exam.id,
      title: exam.title,
      status: ExamStatus.RESULTS_PUBLISHED,
      resultsPublishedAt:
        publishedAt.toISOString(),
      version: exam.version + 1,
    },
    gradedAttempts: exam.attempts.length,
    notifiedStudents: studentIds.length,
    message:
      'Exam results were published successfully.',
  };
}