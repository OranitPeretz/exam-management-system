import { prisma } from '../../database/prisma.js';
import { AppError } from '../../errors/app-error.js';
import {
  ExamStatus,
  QuestionTypeCode,
  UserRole,
} from '../../generated/prisma/client.js';
import type { AuthenticatedActor } from '../exams/exam.service.js';
import type { CreateQuestionInput } from './question.schemas.js';

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
      'Questions can be added only to draft exams.',
    );
  }

  const questionType = await prisma.questionType.findUnique({
    where: {
      code: input.typeCode,
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

  const options = input.options ?? [];

  const gradingConfig =
    input.typeCode === QuestionTypeCode.NUMERIC
      ? {
          correctAnswer: input.correctNumericAnswer ?? 0,
          tolerance: input.numericTolerance ?? 0,
        }
      : undefined;

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
        ...(input.isRequired !== undefined && {
          isRequired: input.isRequired,
        }),
        ...(gradingConfig !== undefined && {
          gradingConfig,
        }),
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