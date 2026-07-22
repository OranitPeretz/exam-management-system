import { prisma } from '../../database/prisma.js';
import { AppError } from '../../errors/app-error.js';
import {
  AttemptStatus,
  EnrollmentStatus,
  ExamStatus,
  Prisma,
} from '../../generated/prisma/client.js';

function createStableHash(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function orderQuestions<
  T extends {
    id: string;
    position: number;
  },
>(
  questions: T[],
  attemptId: string,
  shouldShuffle: boolean,
): T[] {
  if (!shouldShuffle) {
    return questions;
  }

  return [...questions].sort((first, second) => {
    const firstHash = createStableHash(
      `${attemptId}:${first.id}`,
    );

    const secondHash = createStableHash(
      `${attemptId}:${second.id}`,
    );

    if (firstHash !== secondHash) {
      return firstHash - secondHash;
    }

    return first.position - second.position;
  });
}

async function findAccessibleExam(
  studentId: string,
  examId: string,
) {
  const exam = await prisma.exam.findFirst({
    where: {
      id: examId,
      status: ExamStatus.PUBLISHED,
      course: {
        isActive: true,
        enrollments: {
          some: {
            studentId,
            status: EnrollmentStatus.ACTIVE,
          },
        },
      },
    },
    select: {
      id: true,
      title: true,
      description: true,
      instructions: true,
      startAt: true,
      endAt: true,
      durationMinutes: true,
      maxAttempts: true,
      passingPercentage: true,
      shuffleQuestions: true,
      showFeedback: true,
      course: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      questions: {
        orderBy: {
          position: 'asc',
        },
        select: {
          id: true,
          prompt: true,
          points: true,
          position: true,
          isRequired: true,
          type: {
            select: {
              code: true,
              name: true,
            },
          },
          options: {
            orderBy: {
              position: 'asc',
            },
            select: {
              id: true,
              text: true,
              position: true,
            },
          },
        },
      },
    },
  });

  if (!exam) {
    throw new AppError(
      404,
      'STUDENT_EXAM_NOT_FOUND',
      'The requested exam is not available to this student.',
    );
  }

  return exam;
}

function validateExamAvailability(
  startAt: Date | null,
  endAt: Date | null,
  currentTime: Date,
): asserts startAt is Date {
  if (!startAt || !endAt) {
    throw new AppError(
      409,
      'EXAM_SCHEDULE_MISSING',
      'The exam does not have a valid availability window.',
    );
  }

  if (currentTime.getTime() < startAt.getTime()) {
    throw new AppError(
      409,
      'EXAM_NOT_STARTED',
      'The exam has not started yet.',
    );
  }

  if (currentTime.getTime() >= endAt.getTime()) {
    throw new AppError(
      409,
      'EXAM_ENDED',
      'The exam availability window has ended.',
    );
  }
}

function isTransactionConflict(error: unknown): boolean {
  return (
    error instanceof
      Prisma.PrismaClientKnownRequestError &&
    (
      error.code === 'P2002' ||
      error.code === 'P2034'
    )
  );
}

export async function startOrResumeStudentAttempt(
  studentId: string,
  examId: string,
) {
  const currentTime = new Date();

  const exam = await findAccessibleExam(
    studentId,
    examId,
  );

  validateExamAvailability(
    exam.startAt,
    exam.endAt,
    currentTime,
  );

  const endAt = exam.endAt;

  if (!endAt) {
    throw new AppError(
      409,
      'EXAM_SCHEDULE_MISSING',
      'The exam does not have a valid end time.',
    );
  }

  let resolution: {
    attemptId: string;
    resumed: boolean;
  };

  try {
    resolution = await prisma.$transaction(
      async (transaction) => {
        const activeAttempt =
          await transaction.examAttempt.findFirst({
            where: {
              examId: exam.id,
              studentId,
              status: AttemptStatus.IN_PROGRESS,
            },
            orderBy: {
              attemptNumber: 'desc',
            },
            select: {
              id: true,
              attemptNumber: true,
              expiresAt: true,
            },
          });

        if (
          activeAttempt &&
          activeAttempt.expiresAt.getTime() >
            currentTime.getTime()
        ) {
          await transaction.auditLog.create({
            data: {
              actorId: studentId,
              action: 'EXAM_ATTEMPT_RESUMED',
              entityType: 'ExamAttempt',
              entityId: activeAttempt.id,
              metadata: {
                examId: exam.id,
                attemptNumber:
                  activeAttempt.attemptNumber,
              },
            },
          });

          return {
            attemptId: activeAttempt.id,
            resumed: true,
          };
        }

        if (activeAttempt) {
          await transaction.examAttempt.updateMany({
            where: {
              id: activeAttempt.id,
              status: AttemptStatus.IN_PROGRESS,
            },
            data: {
              status: AttemptStatus.AUTO_SUBMITTED,
              submittedAt: currentTime,
              lastActivityAt: currentTime,
              version: {
                increment: 1,
              },
            },
          });

          await transaction.auditLog.create({
            data: {
              actorId: studentId,
              action: 'EXAM_ATTEMPT_AUTO_SUBMITTED',
              entityType: 'ExamAttempt',
              entityId: activeAttempt.id,
              metadata: {
                examId: exam.id,
                reason: 'ATTEMPT_TIME_EXPIRED',
              },
            },
          });
        }

        const attemptsUsed =
          await transaction.examAttempt.count({
            where: {
              examId: exam.id,
              studentId,
            },
          });

        if (attemptsUsed >= exam.maxAttempts) {
          throw new AppError(
            409,
            'MAX_ATTEMPTS_REACHED',
            'The maximum number of attempts has been reached.',
          );
        }

        const attemptNumber = attemptsUsed + 1;

        const durationExpiresAt = new Date(
          currentTime.getTime() +
            exam.durationMinutes * 60_000,
        );

        const expiresAt = new Date(
          Math.min(
            durationExpiresAt.getTime(),
            endAt.getTime(),
          ),
        );

        const attempt =
          await transaction.examAttempt.create({
            data: {
              examId: exam.id,
              studentId,
              attemptNumber,
              status: AttemptStatus.IN_PROGRESS,
              startedAt: currentTime,
              expiresAt,
              lastActivityAt: currentTime,
            },
            select: {
              id: true,
            },
          });

        await transaction.auditLog.create({
          data: {
            actorId: studentId,
            action: 'EXAM_ATTEMPT_STARTED',
            entityType: 'ExamAttempt',
            entityId: attempt.id,
            metadata: {
              examId: exam.id,
              attemptNumber,
              expiresAt: expiresAt.toISOString(),
            },
          },
        });

        return {
          attemptId: attempt.id,
          resumed: false,
        };
      },
      {
        isolationLevel:
          Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  } catch (error) {
    if (isTransactionConflict(error)) {
      throw new AppError(
        409,
        'ATTEMPT_START_CONFLICT',
        'Another attempt request was processed at the same time. Please try again.',
      );
    }

    throw error;
  }

  const attempt = await prisma.examAttempt.findFirst({
    where: {
      id: resolution.attemptId,
      examId: exam.id,
      studentId,
    },
    select: {
      id: true,
      attemptNumber: true,
      status: true,
      startedAt: true,
      expiresAt: true,
      submittedAt: true,
      lastActivityAt: true,
      version: true,
      answers: {
        orderBy: {
          questionId: 'asc',
        },
        select: {
          questionId: true,
          textValue: true,
          numericValue: true,
          booleanValue: true,
          version: true,
          selections: {
            select: {
              optionId: true,
            },
          },
        },
      },
    },
  });

  if (!attempt) {
    throw new AppError(
      500,
      'ATTEMPT_LOAD_FAILED',
      'The exam attempt could not be loaded.',
    );
  }

  const responseTime = new Date();

  const orderedQuestions = orderQuestions(
    exam.questions,
    attempt.id,
    exam.shuffleQuestions,
  );

  const totalPoints = exam.questions.reduce(
    (sum, question) => sum + question.points,
    0,
  );

  return {
    serverTime: responseTime.toISOString(),
    resumed: resolution.resumed,
    remainingSeconds: Math.max(
      Math.floor(
        (
          attempt.expiresAt.getTime() -
          responseTime.getTime()
        ) / 1000,
      ),
      0,
    ),
    attempt: {
      id: attempt.id,
      attemptNumber: attempt.attemptNumber,
      status: attempt.status,
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
      submittedAt: attempt.submittedAt,
      lastActivityAt: attempt.lastActivityAt,
      version: attempt.version,
      answers: attempt.answers.map((answer) => ({
        questionId: answer.questionId,
        textValue: answer.textValue,
        numericValue:
          answer.numericValue === null
            ? null
            : Number(answer.numericValue),
        booleanValue: answer.booleanValue,
        selectedOptionIds: answer.selections.map(
          (selection) => selection.optionId,
        ),
        version: answer.version,
      })),
    },
    exam: {
      id: exam.id,
      title: exam.title,
      description: exam.description,
      instructions: exam.instructions,
      startAt: exam.startAt,
      endAt: exam.endAt,
      durationMinutes: exam.durationMinutes,
      maxAttempts: exam.maxAttempts,
      passingPercentage: exam.passingPercentage,
      shuffleQuestions: exam.shuffleQuestions,
      showFeedback: exam.showFeedback,
      course: exam.course,
      totalPoints,
      questions: orderedQuestions.map(
        (question, index) => ({
          id: question.id,
          prompt: question.prompt,
          points: question.points,
          position: index + 1,
          isRequired: question.isRequired,
          type: question.type,
          options: question.options,
        }),
      ),
    },
  };
}