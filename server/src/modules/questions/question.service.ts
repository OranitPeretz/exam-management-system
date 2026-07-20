import { prisma } from '../../database/prisma.js';
import { AppError } from '../../errors/app-error.js';
import {
  ExamStatus,
  Prisma,
  QuestionTypeCode,
  UserRole,
} from '../../generated/prisma/client.js';
import type { AuthenticatedActor } from '../exams/exam.service.js';
import type {
  CreateQuestionInput,
  UpdateQuestionInput,
} from './question.schemas.js';

async function findManagedDraftExam(
  actor: AuthenticatedActor,
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
      'You cannot manage this exam.',
    );
  }

  if (exam.status !== ExamStatus.DRAFT) {
    throw new AppError(
      409,
      'EXAM_NOT_EDITABLE',
      'Questions can be changed only in draft exams.',
    );
  }

  return exam;
}

async function findAvailableQuestionType(
  typeCode: QuestionTypeCode,
) {
  const questionType = await prisma.questionType.findUnique({
    where: {
      code: typeCode,
    },
    select: {
      id: true,
      code: true,
      isActive: true,
    },
  });

  if (!questionType || !questionType.isActive) {
    throw new AppError(
      404,
      'QUESTION_TYPE_NOT_FOUND',
      'The selected question type is not available.',
    );
  }

  return questionType;
}

async function findQuestionInExam(
  examId: string,
  questionId: string,
) {
  const question = await prisma.question.findFirst({
    where: {
      id: questionId,
      examId,
    },
    select: {
      id: true,
      prompt: true,
      points: true,
      position: true,
      type: {
        select: {
          code: true,
        },
      },
    },
  });

  if (!question) {
    throw new AppError(
      404,
      'QUESTION_NOT_FOUND',
      'The requested question was not found in this exam.',
    );
  }

  return question;
}

function createGradingConfig(
  input: CreateQuestionInput | UpdateQuestionInput,
) {
  if (input.typeCode !== QuestionTypeCode.NUMERIC) {
    return Prisma.DbNull;
  }

  return {
    correctAnswer: input.correctNumericAnswer ?? 0,
    tolerance: input.numericTolerance ?? 0,
  };
}

export async function listQuestionTypes() {
  return prisma.questionType.findMany({
    where: {
      isActive: true,
    },
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      isAutoGradable: true,
    },
    orderBy: {
      name: 'asc',
    },
  });
}

export async function createQuestion(
  actor: AuthenticatedActor,
  examId: string,
  input: CreateQuestionInput,
) {
  const exam = await findManagedDraftExam(actor, examId);

  const questionType = await findAvailableQuestionType(
    input.typeCode,
  );

  const options = input.options ?? [];

  return prisma.$transaction(async (transaction) => {
    const examUpdateResult = await transaction.exam.updateMany({
      where: {
        id: exam.id,
        status: ExamStatus.DRAFT,
        version: exam.version,
      },
      data: {
        version: {
          increment: 1,
        },
      },
    });

    if (examUpdateResult.count !== 1) {
      throw new AppError(
        409,
        'EXAM_UPDATE_CONFLICT',
        'The exam was changed by another request. Reload and try again.',
      );
    }

    const lastQuestion = await transaction.question.findFirst({
      where: {
        examId: exam.id,
      },
      select: {
        position: true,
      },
      orderBy: {
        position: 'desc',
      },
    });

    const nextPosition = (lastQuestion?.position ?? 0) + 1;

    const question = await transaction.question.create({
      data: {
        examId: exam.id,
        typeId: questionType.id,
        prompt: input.prompt,
        points: input.points,
        position: nextPosition,
        isRequired: input.isRequired ?? true,
        gradingConfig: createGradingConfig(input),
        ...(options.length > 0 && {
          options: {
            create: options.map((option, index) => ({
              text: option.text,
              isCorrect: option.isCorrect,
              position: index + 1,
            })),
          },
        }),
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
    });

    await transaction.auditLog.create({
      data: {
        actorId: actor.userId,
        action: 'QUESTION_CREATED',
        entityType: 'Question',
        entityId: question.id,
        metadata: {
          examId: exam.id,
          examTitle: exam.title,
          typeCode: questionType.code,
          points: question.points,
          position: question.position,
        },
      },
    });

    return question;
  });
}

export async function updateQuestion(
  actor: AuthenticatedActor,
  examId: string,
  questionId: string,
  input: UpdateQuestionInput,
) {
  const exam = await findManagedDraftExam(actor, examId);

  const existingQuestion = await findQuestionInExam(
    exam.id,
    questionId,
  );

  const questionType = await findAvailableQuestionType(
    input.typeCode,
  );

  const options = input.options ?? [];

  return prisma.$transaction(async (transaction) => {
    const examUpdateResult = await transaction.exam.updateMany({
      where: {
        id: exam.id,
        status: ExamStatus.DRAFT,
        version: exam.version,
      },
      data: {
        version: {
          increment: 1,
        },
      },
    });

    if (examUpdateResult.count !== 1) {
      throw new AppError(
        409,
        'EXAM_UPDATE_CONFLICT',
        'The exam was changed by another request. Reload and try again.',
      );
    }

    await transaction.questionOption.deleteMany({
      where: {
        questionId: existingQuestion.id,
      },
    });

    const updatedQuestion = await transaction.question.update({
      where: {
        id: existingQuestion.id,
      },
      data: {
        typeId: questionType.id,
        prompt: input.prompt,
        points: input.points,
        isRequired: input.isRequired ?? true,
        gradingConfig: createGradingConfig(input),
        ...(options.length > 0 && {
          options: {
            create: options.map((option, index) => ({
              text: option.text,
              isCorrect: option.isCorrect,
              position: index + 1,
            })),
          },
        }),
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
    });

    await transaction.auditLog.create({
      data: {
        actorId: actor.userId,
        action: 'QUESTION_UPDATED',
        entityType: 'Question',
        entityId: updatedQuestion.id,
        metadata: {
          examId: exam.id,
          previousTypeCode: existingQuestion.type.code,
          newTypeCode: questionType.code,
          previousPoints: existingQuestion.points,
          newPoints: updatedQuestion.points,
        },
      },
    });

    return updatedQuestion;
  });
}

export async function deleteQuestion(
  actor: AuthenticatedActor,
  examId: string,
  questionId: string,
): Promise<void> {
  const exam = await findManagedDraftExam(actor, examId);

  const existingQuestion = await findQuestionInExam(
    exam.id,
    questionId,
  );

  await prisma.$transaction(async (transaction) => {
    const examUpdateResult = await transaction.exam.updateMany({
      where: {
        id: exam.id,
        status: ExamStatus.DRAFT,
        version: exam.version,
      },
      data: {
        version: {
          increment: 1,
        },
      },
    });

    if (examUpdateResult.count !== 1) {
      throw new AppError(
        409,
        'EXAM_UPDATE_CONFLICT',
        'The exam was changed by another request. Reload and try again.',
      );
    }

    const deleteResult = await transaction.question.deleteMany({
      where: {
        id: existingQuestion.id,
        examId: exam.id,
      },
    });

    if (deleteResult.count !== 1) {
      throw new AppError(
        409,
        'QUESTION_DELETE_CONFLICT',
        'The question was changed by another request.',
      );
    }

    await transaction.auditLog.create({
      data: {
        actorId: actor.userId,
        action: 'QUESTION_DELETED',
        entityType: 'Question',
        entityId: existingQuestion.id,
        metadata: {
          examId: exam.id,
          prompt: existingQuestion.prompt,
          position: existingQuestion.position,
        },
      },
    });
  });
}