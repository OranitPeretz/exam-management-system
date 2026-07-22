import { prisma } from '../../database/prisma.js';
import { AppError } from '../../errors/app-error.js';
import {
  AttemptStatus,
  Prisma,
  QuestionTypeCode,
} from '../../generated/prisma/client.js';
import type { SaveStudentAnswerInput } from './student-answer.schemas.js';

const choiceQuestionTypes =
  new Set<QuestionTypeCode>([
    QuestionTypeCode.SINGLE_CHOICE,
    QuestionTypeCode.MULTIPLE_CHOICE,
    QuestionTypeCode.TRUE_FALSE,
  ]);

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

async function markExpiredAttempt(
  attemptId: string,
  studentId: string,
  currentTime: Date,
): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    const updateResult =
      await transaction.examAttempt.updateMany({
        where: {
          id: attemptId,
          studentId,
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

    if (updateResult.count === 1) {
      await transaction.auditLog.create({
        data: {
          actorId: studentId,
          action: 'EXAM_ATTEMPT_AUTO_SUBMITTED',
          entityType: 'ExamAttempt',
          entityId: attemptId,
          metadata: {
            reason: 'ANSWER_SAVE_AFTER_EXPIRATION',
          },
        },
      });
    }
  });
}

function validateAnswerForQuestion(
  question: {
    type: {
      code: QuestionTypeCode;
    };
    options: Array<{
      id: string;
    }>;
  },
  input: SaveStudentAnswerInput,
): void {
  const typeCode = question.type.code;

  if (choiceQuestionTypes.has(typeCode)) {
    if (input.selectedOptionIds === undefined) {
      throw new AppError(
        422,
        'OPTION_SELECTION_REQUIRED',
        'This question requires selected option IDs.',
      );
    }

    if (
      (
        typeCode === QuestionTypeCode.SINGLE_CHOICE ||
        typeCode === QuestionTypeCode.TRUE_FALSE
      ) &&
      input.selectedOptionIds.length > 1
    ) {
      throw new AppError(
        422,
        'TOO_MANY_OPTIONS_SELECTED',
        'This question accepts at most one selected option.',
      );
    }

    const validOptionIds = new Set(
      question.options.map((option) => option.id),
    );

    const containsInvalidOption =
      input.selectedOptionIds.some(
        (optionId) => !validOptionIds.has(optionId),
      );

    if (containsInvalidOption) {
      throw new AppError(
        422,
        'INVALID_QUESTION_OPTION',
        'A selected option does not belong to this question.',
      );
    }

    return;
  }

  if (
    (
      typeCode === QuestionTypeCode.SHORT_TEXT ||
      typeCode === QuestionTypeCode.LONG_TEXT
    ) &&
    input.textValue === undefined
  ) {
    throw new AppError(
      422,
      'TEXT_ANSWER_REQUIRED',
      'This question requires a text answer.',
    );
  }

  if (
    typeCode === QuestionTypeCode.SHORT_TEXT &&
    input.textValue &&
    input.textValue.length > 2_000
  ) {
    throw new AppError(
      422,
      'SHORT_TEXT_ANSWER_TOO_LONG',
      'A short text answer cannot exceed 2000 characters.',
    );
  }

  if (
    typeCode === QuestionTypeCode.NUMERIC &&
    input.numericValue === undefined
  ) {
    throw new AppError(
      422,
      'NUMERIC_ANSWER_REQUIRED',
      'This question requires a numeric answer.',
    );
  }
}

export async function saveStudentAnswer(
  studentId: string,
  attemptId: string,
  questionId: string,
  input: SaveStudentAnswerInput,
) {
  const currentTime = new Date();

  const attempt = await prisma.examAttempt.findFirst({
    where: {
      id: attemptId,
      studentId,
    },
    select: {
      id: true,
      examId: true,
      status: true,
      expiresAt: true,
    },
  });

  if (!attempt) {
    throw new AppError(
      404,
      'ATTEMPT_NOT_FOUND',
      'The requested exam attempt was not found.',
    );
  }

  if (attempt.status !== AttemptStatus.IN_PROGRESS) {
    throw new AppError(
      409,
      'ATTEMPT_NOT_EDITABLE',
      'Answers can be changed only during an active attempt.',
    );
  }

  if (
    attempt.expiresAt.getTime() <=
    currentTime.getTime()
  ) {
    await markExpiredAttempt(
      attempt.id,
      studentId,
      currentTime,
    );

    throw new AppError(
      409,
      'ATTEMPT_EXPIRED',
      'The exam attempt has expired and was submitted automatically.',
    );
  }

  const question = await prisma.question.findFirst({
    where: {
      id: questionId,
      examId: attempt.examId,
    },
    select: {
      id: true,
      type: {
        select: {
          code: true,
        },
      },
      options: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!question) {
    throw new AppError(
      404,
      'QUESTION_NOT_FOUND',
      'The question was not found in this exam.',
    );
  }

  validateAnswerForQuestion(question, input);

  const selectedOptionIds =
    input.selectedOptionIds ?? [];

  try {
    return await prisma.$transaction(
      async (transaction) => {
        const activeAttempt =
          await transaction.examAttempt.findFirst({
            where: {
              id: attempt.id,
              studentId,
              status: AttemptStatus.IN_PROGRESS,
              expiresAt: {
                gt: currentTime,
              },
            },
            select: {
              id: true,
            },
          });

        if (!activeAttempt) {
          throw new AppError(
            409,
            'ATTEMPT_NOT_EDITABLE',
            'The exam attempt is no longer active.',
          );
        }

        const existingAnswer =
          await transaction.answer.findUnique({
            where: {
              attemptId_questionId: {
                attemptId: attempt.id,
                questionId: question.id,
              },
            },
            select: {
              id: true,
              version: true,
            },
          });

        if (
          input.version !== undefined &&
          (
            !existingAnswer ||
            existingAnswer.version !== input.version
          )
        ) {
          throw new AppError(
            409,
            'ANSWER_VERSION_CONFLICT',
            'The answer was changed by another request. Reload and try again.',
          );
        }

        const answer =
          await transaction.answer.upsert({
            where: {
              attemptId_questionId: {
                attemptId: attempt.id,
                questionId: question.id,
              },
            },
            create: {
              attemptId: attempt.id,
              questionId: question.id,
              textValue:
                input.textValue ?? null,
              numericValue:
                input.numericValue ?? null,
              booleanValue: null,
            },
            update: {
              textValue:
                input.textValue ?? null,
              numericValue:
                input.numericValue ?? null,
              booleanValue: null,
              awardedPoints: null,
              feedback: null,
              isAutoGraded: false,
              version: {
                increment: 1,
              },
            },
            select: {
              id: true,
              questionId: true,
              textValue: true,
              numericValue: true,
              booleanValue: true,
              version: true,
              updatedAt: true,
            },
          });

        await transaction.answerSelection.deleteMany({
          where: {
            answerId: answer.id,
          },
        });

        if (selectedOptionIds.length > 0) {
          await transaction.answerSelection.createMany({
            data: selectedOptionIds.map((optionId) => ({
              answerId: answer.id,
              optionId,
            })),
          });
        }

        const updatedAttempt =
          await transaction.examAttempt.update({
            where: {
              id: attempt.id,
            },
            data: {
              lastActivityAt: currentTime,
              version: {
                increment: 1,
              },
            },
            select: {
              version: true,
              lastActivityAt: true,
            },
          });

        return {
          savedAt: answer.updatedAt.toISOString(),
          attemptVersion: updatedAttempt.version,
          lastActivityAt:
            updatedAttempt.lastActivityAt.toISOString(),
          answer: {
            questionId: answer.questionId,
            textValue: answer.textValue,
            numericValue:
              answer.numericValue === null
                ? null
                : Number(answer.numericValue),
            booleanValue: answer.booleanValue,
            selectedOptionIds,
            version: answer.version,
          },
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
        'ANSWER_SAVE_CONFLICT',
        'Another answer request was processed at the same time. Please try again.',
      );
    }

    throw error;
  }
}