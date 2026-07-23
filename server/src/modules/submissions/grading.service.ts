import { prisma } from '../../database/prisma.js';
import { AppError } from '../../errors/app-error.js';
import {
  AttemptStatus,
  ExamStatus,
  Prisma,
  UserRole,
} from '../../generated/prisma/client.js';
import type { GradeSubmissionInput } from './grading.schemas.js';
import {
  getSubmissionDetails,
  type AuthenticatedSubmissionActor,
} from './submission.service.js';

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

function normalizeFeedback(
  value: string | null | undefined,
): string | null {
  const normalizedValue = value?.trim();

  return normalizedValue
    ? normalizedValue
    : null;
}

export async function gradeSubmission(
  actor: AuthenticatedSubmissionActor,
  attemptId: string,
  input: GradeSubmissionInput,
) {
  const attempt = await prisma.examAttempt.findUnique({
    where: {
      id: attemptId,
    },
    select: {
      id: true,
      status: true,
      version: true,
      studentId: true,
      score: true,
      exam: {
        select: {
          id: true,
          status: true,
          course: {
            select: {
              lecturerId: true,
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
              type: {
                select: {
                  isAutoGradable: true,
                },
              },
            },
          },
        },
      },
      answers: {
        select: {
          questionId: true,
          awardedPoints: true,
          isAutoGraded: true,
        },
      },
    },
  });

  if (!attempt) {
    throw new AppError(
      404,
      'ATTEMPT_NOT_FOUND',
      'The requested exam attempt was not found.',
    );
  }

  if (
    actor.role !== UserRole.ADMIN &&
    attempt.exam.course.lecturerId !== actor.userId
  ) {
    throw new AppError(
      403,
      'SUBMISSION_ACCESS_DENIED',
      'You cannot grade this submission.',
    );
  }

  if (
    attempt.status !== AttemptStatus.GRADING &&
    attempt.status !== AttemptStatus.GRADED
  ) {
    throw new AppError(
      409,
      'ATTEMPT_NOT_GRADABLE',
      'Only submitted attempts can be graded.',
    );
  }

  if (
    attempt.exam.status ===
      ExamStatus.RESULTS_PUBLISHED ||
    attempt.exam.status === ExamStatus.ARCHIVED
  ) {
    throw new AppError(
      409,
      'RESULTS_ALREADY_PUBLISHED',
      'Grades cannot be changed after results publication.',
    );
  }

  if (input.version !== attempt.version) {
    throw new AppError(
      409,
      'GRADING_VERSION_CONFLICT',
      'The submission was changed. Reload it before grading.',
    );
  }

  const manualQuestions =
    attempt.exam.questions.filter(
      (question) =>
        !question.type.isAutoGradable,
    );

  if (manualQuestions.length === 0) {
    throw new AppError(
      409,
      'NO_MANUAL_GRADING_REQUIRED',
      'This submission does not contain manually graded questions.',
    );
  }

  const manualQuestionById = new Map(
    manualQuestions.map((question) => [
      question.id,
      question,
    ]),
  );

  const submittedGradeByQuestionId = new Map(
    input.answers.map((answer) => [
      answer.questionId,
      answer,
    ]),
  );

  const unknownQuestionIds = input.answers
    .filter(
      (answer) =>
        !manualQuestionById.has(answer.questionId),
    )
    .map((answer) => answer.questionId);

  if (unknownQuestionIds.length > 0) {
    throw new AppError(
      422,
      'INVALID_MANUAL_GRADING_QUESTIONS',
      'Only manually graded questions may be included.',
      {
        questionIds: unknownQuestionIds,
      },
    );
  }

  const missingQuestionIds = manualQuestions
    .filter(
      (question) =>
        !submittedGradeByQuestionId.has(
          question.id,
        ),
    )
    .map((question) => question.id);

  if (missingQuestionIds.length > 0) {
    throw new AppError(
      422,
      'MANUAL_GRADES_MISSING',
      'Every manually graded question must receive a grade.',
      {
        questionIds: missingQuestionIds,
      },
    );
  }

  for (const answerGrade of input.answers) {
    const question = manualQuestionById.get(
      answerGrade.questionId,
    );

    if (
      question &&
      answerGrade.awardedPoints > question.points
    ) {
      throw new AppError(
        422,
        'AWARDED_POINTS_EXCEED_MAXIMUM',
        'Awarded points cannot exceed the question maximum.',
        {
          questionId: question.id,
          position: question.position,
          maximumPoints: question.points,
          awardedPoints:
            answerGrade.awardedPoints,
        },
      );
    }
  }

  const automaticScore = attempt.answers.reduce(
    (sum, answer) => {
      if (!answer.isAutoGraded) {
        return sum;
      }

      return sum + (answer.awardedPoints ?? 0);
    },
    0,
  );

  const manualScore = input.answers.reduce(
    (sum, answer) =>
      sum + answer.awardedPoints,
    0,
  );

  const finalScore =
    automaticScore + manualScore;

  const maximumScore =
    attempt.exam.questions.reduce(
      (sum, question) =>
        sum + question.points,
      0,
    );

  const percentage =
    maximumScore === 0
      ? 0
      : Math.round(
          (finalScore / maximumScore) *
            10000,
        ) / 100;

  const gradedAt = new Date();

  try {
    await prisma.$transaction(
      async (transaction) => {
        for (const answerGrade of input.answers) {
          await transaction.answer.upsert({
            where: {
              attemptId_questionId: {
                attemptId: attempt.id,
                questionId:
                  answerGrade.questionId,
              },
            },
            create: {
              attemptId: attempt.id,
              questionId:
                answerGrade.questionId,
              awardedPoints:
                answerGrade.awardedPoints,
              feedback: normalizeFeedback(
                answerGrade.feedback,
              ),
              isAutoGraded: false,
            },
            update: {
              awardedPoints:
                answerGrade.awardedPoints,
              feedback: normalizeFeedback(
                answerGrade.feedback,
              ),
              isAutoGraded: false,
              version: {
                increment: 1,
              },
            },
          });
        }

        const updateResult =
          await transaction.examAttempt.updateMany({
            where: {
              id: attempt.id,
              version: input.version,
              status: {
                in: [
                  AttemptStatus.GRADING,
                  AttemptStatus.GRADED,
                ],
              },
            },
            data: {
              status: AttemptStatus.GRADED,
              score: finalScore,
              maxScore: maximumScore,
              percentage,
              feedback: normalizeFeedback(
                input.feedback,
              ),
              gradedById: actor.userId,
              gradedAt,
              version: {
                increment: 1,
              },
            },
          });

        if (updateResult.count !== 1) {
          throw new AppError(
            409,
            'GRADING_VERSION_CONFLICT',
            'The submission was changed. Reload it before grading.',
          );
        }

        await transaction.auditLog.create({
          data: {
            actorId: actor.userId,
            action:
              attempt.status ===
              AttemptStatus.GRADED
                ? 'EXAM_ATTEMPT_REGRADED'
                : 'EXAM_ATTEMPT_GRADED',
            entityType: 'ExamAttempt',
            entityId: attempt.id,
            metadata: {
              examId: attempt.exam.id,
              studentId: attempt.studentId,
              previousScore: attempt.score,
              automaticScore,
              manualScore,
              finalScore,
              maximumScore,
              percentage,
              previousVersion:
                attempt.version,
              newVersion:
                attempt.version + 1,
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
        'GRADING_VERSION_CONFLICT',
        'Another request changed the submission. Reload it and try again.',
      );
    }

    throw error;
  }

  return getSubmissionDetails(
    actor,
    attempt.id,
  );
}