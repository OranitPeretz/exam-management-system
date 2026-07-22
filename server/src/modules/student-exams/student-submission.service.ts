import { prisma } from '../../database/prisma.js';
import { AppError } from '../../errors/app-error.js';
import {
  AttemptStatus,
  NotificationType,
  Prisma,
  QuestionTypeCode,
} from '../../generated/prisma/client.js';

interface SubmissionQuestion {
  id: string;
  points: number;
  position: number;
  isRequired: boolean;
  gradingConfig: unknown;
  type: {
    code: QuestionTypeCode;
    isAutoGradable: boolean;
  };
  options: Array<{
    id: string;
    isCorrect: boolean;
  }>;
}

interface SubmissionAnswer {
  id: string;
  questionId: string;
  textValue: string | null;
  numericValue: unknown;
  selections: Array<{
    optionId: string;
  }>;
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

function areSetsEqual(
  first: Set<string>,
  second: Set<string>,
): boolean {
  if (first.size !== second.size) {
    return false;
  }

  return [...first].every((value) =>
    second.has(value),
  );
}

function readNumericConfiguration(
  gradingConfig: unknown,
): {
  correctAnswer: number;
  tolerance: number;
} | null {
  if (
    typeof gradingConfig !== 'object' ||
    gradingConfig === null ||
    Array.isArray(gradingConfig)
  ) {
    return null;
  }

  const configuration =
    gradingConfig as Record<string, unknown>;

  if (
    typeof configuration.correctAnswer !== 'number'
  ) {
    return null;
  }

  return {
    correctAnswer: configuration.correctAnswer,
    tolerance:
      typeof configuration.tolerance === 'number'
        ? configuration.tolerance
        : 0,
  };
}

function isQuestionAnswered(
  question: SubmissionQuestion,
  answer: SubmissionAnswer | undefined,
): boolean {
  if (!answer) {
    return false;
  }

  switch (question.type.code) {
    case QuestionTypeCode.SINGLE_CHOICE:
    case QuestionTypeCode.MULTIPLE_CHOICE:
    case QuestionTypeCode.TRUE_FALSE:
      return answer.selections.length > 0;

    case QuestionTypeCode.SHORT_TEXT:
    case QuestionTypeCode.LONG_TEXT:
      return Boolean(answer.textValue?.trim());

    case QuestionTypeCode.NUMERIC:
      return answer.numericValue !== null;

    default:
      return false;
  }
}

function gradeAutomaticQuestion(
  question: SubmissionQuestion,
  answer: SubmissionAnswer | undefined,
): number {
  if (!answer) {
    return 0;
  }

  switch (question.type.code) {
    case QuestionTypeCode.SINGLE_CHOICE:
    case QuestionTypeCode.MULTIPLE_CHOICE:
    case QuestionTypeCode.TRUE_FALSE: {
      const correctOptionIds = new Set(
        question.options
          .filter((option) => option.isCorrect)
          .map((option) => option.id),
      );

      const selectedOptionIds = new Set(
        answer.selections.map(
          (selection) => selection.optionId,
        ),
      );

      return areSetsEqual(
        correctOptionIds,
        selectedOptionIds,
      )
        ? question.points
        : 0;
    }

    case QuestionTypeCode.NUMERIC: {
      if (answer.numericValue === null) {
        return 0;
      }

      const configuration =
        readNumericConfiguration(
          question.gradingConfig,
        );

      if (!configuration) {
        return 0;
      }

      const submittedValue = Number(
        answer.numericValue,
      );

      const difference = Math.abs(
        submittedValue -
          configuration.correctAnswer,
      );

      return difference <= configuration.tolerance
        ? question.points
        : 0;
    }

    default:
      return 0;
  }
}

export async function submitStudentAttempt(
  studentId: string,
  attemptId: string,
) {
  const currentTime = new Date();

  try {
    return await prisma.$transaction(
      async (transaction) => {
        const attempt =
          await transaction.examAttempt.findFirst({
            where: {
              id: attemptId,
              studentId,
            },
            select: {
              id: true,
              attemptNumber: true,
              status: true,
              expiresAt: true,
              version: true,
              exam: {
                select: {
                  id: true,
                  title: true,
                  courseId: true,
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
                      points: true,
                      position: true,
                      isRequired: true,
                      gradingConfig: true,
                      type: {
                        select: {
                          code: true,
                          isAutoGradable: true,
                        },
                      },
                      options: {
                        select: {
                          id: true,
                          isCorrect: true,
                        },
                      },
                    },
                  },
                },
              },
              answers: {
                select: {
                  id: true,
                  questionId: true,
                  textValue: true,
                  numericValue: true,
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
            404,
            'ATTEMPT_NOT_FOUND',
            'The requested exam attempt was not found.',
          );
        }

        if (
          attempt.status !== AttemptStatus.IN_PROGRESS
        ) {
          throw new AppError(
            409,
            'ATTEMPT_ALREADY_SUBMITTED',
            'This exam attempt has already been submitted.',
          );
        }

        const wasAutomaticallySubmitted =
          attempt.expiresAt.getTime() <=
          currentTime.getTime();

        const answerByQuestionId = new Map(
          attempt.answers.map((answer) => [
            answer.questionId,
            answer,
          ]),
        );

        const missingRequiredQuestions =
          attempt.exam.questions.filter(
            (question) =>
              question.isRequired &&
              !isQuestionAnswered(
                question,
                answerByQuestionId.get(question.id),
              ),
          );

        if (
          !wasAutomaticallySubmitted &&
          missingRequiredQuestions.length > 0
        ) {
          throw new AppError(
            422,
            'REQUIRED_QUESTIONS_MISSING',
            'All required questions must be answered before submission.',
            {
              positions:
                missingRequiredQuestions.map(
                  (question) =>
                    question.position,
                ),
            },
          );
        }

        const maxScore =
          attempt.exam.questions.reduce(
            (sum, question) =>
              sum + question.points,
            0,
          );

        let automaticallyAwardedScore = 0;

        for (
          const question of attempt.exam.questions
        ) {
          const answer =
            answerByQuestionId.get(question.id);

          if (question.type.isAutoGradable) {
            const awardedPoints =
              gradeAutomaticQuestion(
                question,
                answer,
              );

            automaticallyAwardedScore +=
              awardedPoints;

            if (answer) {
              await transaction.answer.update({
                where: {
                  id: answer.id,
                },
                data: {
                  awardedPoints,
                  isAutoGraded: true,
                },
              });
            }
          } else if (answer) {
            await transaction.answer.update({
              where: {
                id: answer.id,
              },
              data: {
                awardedPoints: null,
                isAutoGraded: false,
              },
            });
          }
        }

        const requiresManualGrading =
          attempt.exam.questions.some(
            (question) =>
              !question.type.isAutoGradable,
          );

        const nextStatus =
          requiresManualGrading
            ? AttemptStatus.GRADING
            : AttemptStatus.GRADED;

        const percentage =
          !requiresManualGrading && maxScore > 0
            ? (
                automaticallyAwardedScore /
                maxScore
              ) * 100
            : null;

        const updateResult =
          await transaction.examAttempt.updateMany({
            where: {
              id: attempt.id,
              studentId,
              status: AttemptStatus.IN_PROGRESS,
              version: attempt.version,
            },
            data: {
              status: nextStatus,
              submittedAt: currentTime,
              lastActivityAt: currentTime,
              score: automaticallyAwardedScore,
              maxScore,
              percentage,
              gradedAt: requiresManualGrading
                ? null
                : currentTime,
              version: {
                increment: 1,
              },
            },
          });

        if (updateResult.count !== 1) {
          throw new AppError(
            409,
            'ATTEMPT_SUBMISSION_CONFLICT',
            'The attempt was changed by another request. Reload and try again.',
          );
        }

        await transaction.notification.create({
          data: {
            userId:
              attempt.exam.course.lecturerId,
            type: NotificationType.EXAM_SUBMITTED,
            title: 'Exam submitted',
            message: `A student submitted ${attempt.exam.title}.`,
            metadata: {
              examId: attempt.exam.id,
              attemptId: attempt.id,
              studentId,
              attemptNumber:
                attempt.attemptNumber,
              requiresManualGrading,
            },
          },
        });

        await transaction.auditLog.create({
          data: {
            actorId: studentId,
            action: wasAutomaticallySubmitted
              ? 'EXAM_ATTEMPT_AUTO_SUBMITTED'
              : 'EXAM_ATTEMPT_SUBMITTED',
            entityType: 'ExamAttempt',
            entityId: attempt.id,
            metadata: {
              examId: attempt.exam.id,
              attemptNumber:
                attempt.attemptNumber,
              answeredQuestions:
                attempt.answers.length,
              totalQuestions:
                attempt.exam.questions.length,
              requiresManualGrading,
              autoGradedScore:
                automaticallyAwardedScore,
              maxScore,
            },
          },
        });

        return {
          attempt: {
            id: attempt.id,
            attemptNumber:
              attempt.attemptNumber,
            status: nextStatus,
            submittedAt:
              currentTime.toISOString(),
          },
          answeredQuestions:
            attempt.answers.length,
          totalQuestions:
            attempt.exam.questions.length,
          requiresManualGrading,
          wasAutomaticallySubmitted,
          message: requiresManualGrading
            ? 'The exam was submitted and is waiting for lecturer grading.'
            : 'The exam was submitted and graded. Results will be available after publication by the lecturer.',
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
        'ATTEMPT_SUBMISSION_CONFLICT',
        'Another request changed the attempt. Please try again.',
      );
    }

    throw error;
  }
}