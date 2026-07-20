import { prisma } from '../../database/prisma.js';
import { AppError } from '../../errors/app-error.js';
import {
  EnrollmentStatus,
  ExamStatus,
  NotificationType,
  QuestionTypeCode,
  UserRole,
} from '../../generated/prisma/client.js';
import {
  getManagedExamDetails,
  type AuthenticatedActor,
} from './exam.service.js';

interface PublishableQuestion {
  id: string;
  position: number;
  points: number;
  gradingConfig: unknown;
  type: {
    code: QuestionTypeCode;
  };
  options: Array<{
    isCorrect: boolean;
  }>;
}

function hasNumericCorrectAnswer(
  gradingConfig: unknown,
): boolean {
  if (
    typeof gradingConfig !== 'object' ||
    gradingConfig === null ||
    Array.isArray(gradingConfig)
  ) {
    return false;
  }

  const config = gradingConfig as Record<string, unknown>;

  return typeof config.correctAnswer === 'number';
}

function validateQuestionForPublication(
  question: PublishableQuestion,
): void {
  const correctOptionsCount = question.options.filter(
    (option) => option.isCorrect,
  ).length;

  if (
    question.type.code === QuestionTypeCode.SINGLE_CHOICE &&
    (
      question.options.length < 2 ||
      correctOptionsCount !== 1
    )
  ) {
    throw new AppError(
      422,
      'INVALID_SINGLE_CHOICE_QUESTION',
      'A single choice question must have at least two options and one correct option.',
      {
        questionId: question.id,
        position: question.position,
      },
    );
  }

  if (
    question.type.code === QuestionTypeCode.MULTIPLE_CHOICE &&
    (
      question.options.length < 2 ||
      correctOptionsCount < 1
    )
  ) {
    throw new AppError(
      422,
      'INVALID_MULTIPLE_CHOICE_QUESTION',
      'A multiple choice question must have at least two options and a correct option.',
      {
        questionId: question.id,
        position: question.position,
      },
    );
  }

  if (
    question.type.code === QuestionTypeCode.TRUE_FALSE &&
    (
      question.options.length !== 2 ||
      correctOptionsCount !== 1
    )
  ) {
    throw new AppError(
      422,
      'INVALID_TRUE_FALSE_QUESTION',
      'A true or false question must have two options and one correct option.',
      {
        questionId: question.id,
        position: question.position,
      },
    );
  }

  if (
    question.type.code === QuestionTypeCode.NUMERIC &&
    !hasNumericCorrectAnswer(question.gradingConfig)
  ) {
    throw new AppError(
      422,
      'INVALID_NUMERIC_QUESTION',
      'A numeric question must contain a correct numeric answer.',
      {
        questionId: question.id,
        position: question.position,
      },
    );
  }
}

export async function publishExam(
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
      durationMinutes: true,
      version: true,
      course: {
        select: {
          code: true,
          name: true,
          lecturerId: true,
        },
      },
      questions: {
        orderBy: {
          position: 'asc',
        },
        select: {
          id: true,
          position: true,
          points: true,
          gradingConfig: true,
          type: {
            select: {
              code: true,
            },
          },
          options: {
            select: {
              isCorrect: true,
            },
          },
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
      'EXAM_ACCESS_DENIED',
      'You cannot publish this exam.',
    );
  }

  if (exam.status !== ExamStatus.DRAFT) {
    throw new AppError(
      409,
      'EXAM_NOT_PUBLISHABLE',
      'Only draft exams can be published.',
    );
  }

  const { startAt, endAt } = exam;

  if (!startAt || !endAt) {
    throw new AppError(
      422,
      'EXAM_SCHEDULE_REQUIRED',
      'Start and end times are required before publication.',
    );
  }

  if (endAt.getTime() <= startAt.getTime()) {
    throw new AppError(
      422,
      'INVALID_EXAM_SCHEDULE',
      'Exam end time must be later than start time.',
    );
  }

  if (endAt.getTime() <= Date.now()) {
    throw new AppError(
      422,
      'EXAM_END_TIME_EXPIRED',
      'Exam end time must be in the future.',
    );
  }

  const availabilityMinutes =
    (endAt.getTime() - startAt.getTime()) / 60_000;

  if (availabilityMinutes < exam.durationMinutes) {
    throw new AppError(
      422,
      'EXAM_WINDOW_TOO_SHORT',
      'The availability window cannot be shorter than the exam duration.',
    );
  }

  if (exam.questions.length === 0) {
    throw new AppError(
      422,
      'EXAM_HAS_NO_QUESTIONS',
      'At least one question is required before publication.',
    );
  }

  for (const question of exam.questions) {
    validateQuestionForPublication(question);
  }

  const totalPoints = exam.questions.reduce(
    (sum, question) => sum + question.points,
    0,
  );

  if (totalPoints <= 0) {
    throw new AppError(
      422,
      'EXAM_HAS_NO_POINTS',
      'The exam must contain at least one point.',
    );
  }

  await prisma.$transaction(async (transaction) => {
    const publishResult = await transaction.exam.updateMany({
      where: {
        id: exam.id,
        status: ExamStatus.DRAFT,
        version: exam.version,
      },
      data: {
        status: ExamStatus.PUBLISHED,
        publishedAt: new Date(),
        version: {
          increment: 1,
        },
      },
    });

    if (publishResult.count !== 1) {
      throw new AppError(
        409,
        'EXAM_PUBLISH_CONFLICT',
        'The exam was changed by another request. Reload and try again.',
      );
    }

    const enrollments = await transaction.enrollment.findMany({
      where: {
        courseId: exam.courseId,
        status: EnrollmentStatus.ACTIVE,
        student: {
          isActive: true,
        },
      },
      select: {
        studentId: true,
      },
    });

    if (enrollments.length > 0) {
      await transaction.notification.createMany({
        data: enrollments.map((enrollment) => ({
          userId: enrollment.studentId,
          type: NotificationType.EXAM_PUBLISHED,
          title: 'New exam published',
          message: `${exam.title} is now available in ${exam.course.code}.`,
          metadata: {
            examId: exam.id,
            courseId: exam.courseId,
            startAt: startAt.toISOString(),
            endAt: endAt.toISOString(),
          },
        })),
      });
    }

    await transaction.auditLog.create({
      data: {
        actorId: actor.userId,
        action: 'EXAM_PUBLISHED',
        entityType: 'Exam',
        entityId: exam.id,
        metadata: {
          courseId: exam.courseId,
          totalQuestions: exam.questions.length,
          totalPoints,
          notifiedStudents: enrollments.length,
        },
      },
    });
  });

  return getManagedExamDetails(actor, exam.id);
}