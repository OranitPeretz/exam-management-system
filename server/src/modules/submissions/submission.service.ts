import { prisma } from '../../database/prisma.js';
import { AppError } from '../../errors/app-error.js';
import {
  AttemptStatus,
  UserRole,
} from '../../generated/prisma/client.js';

export interface AuthenticatedSubmissionActor {
  userId: string;
  role: UserRole;
}

export async function listExamSubmissions(
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
      course: {
        select: {
          id: true,
          code: true,
          name: true,
          lecturerId: true,
        },
      },
      questions: {
        select: {
          points: true,
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
      'You cannot review submissions for this exam.',
    );
  }

  const attempts = await prisma.examAttempt.findMany({
    where: {
      examId: exam.id,
      status: {
        not: AttemptStatus.IN_PROGRESS,
      },
    },
    orderBy: [
      {
        submittedAt: 'desc',
      },
      {
        attemptNumber: 'desc',
      },
    ],
    select: {
      id: true,
      attemptNumber: true,
      status: true,
      startedAt: true,
      submittedAt: true,
      score: true,
      maxScore: true,
      percentage: true,
      feedback: true,
      gradedAt: true,
      version: true,
      student: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
      _count: {
        select: {
          answers: true,
        },
      },
    },
  });

  const waitingForGrading = attempts.filter(
    (attempt) =>
      attempt.status === AttemptStatus.GRADING ||
      attempt.status === AttemptStatus.SUBMITTED ||
      attempt.status === AttemptStatus.AUTO_SUBMITTED,
  ).length;

  const graded = attempts.filter(
    (attempt) =>
      attempt.status === AttemptStatus.GRADED,
  ).length;

  const totalPoints = exam.questions.reduce(
    (sum, question) => sum + question.points,
    0,
  );

  return {
    exam: {
      id: exam.id,
      title: exam.title,
      status: exam.status,
      totalPoints,
      course: {
        id: exam.course.id,
        code: exam.course.code,
        name: exam.course.name,
      },
    },
    summary: {
      totalSubmissions: attempts.length,
      waitingForGrading,
      graded,
    },
    submissions: attempts.map((attempt) => ({
      id: attempt.id,
      attemptNumber: attempt.attemptNumber,
      status: attempt.status,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      score: attempt.score,
      maxScore: attempt.maxScore,
      percentage: attempt.percentage,
      feedback: attempt.feedback,
      gradedAt: attempt.gradedAt,
      version: attempt.version,
      answeredQuestions: attempt._count.answers,
      student: attempt.student,
    })),
  };
}

export async function getSubmissionDetails(
  actor: AuthenticatedSubmissionActor,
  attemptId: string,
) {
  const attempt = await prisma.examAttempt.findUnique({
    where: {
      id: attemptId,
    },
    select: {
      id: true,
      attemptNumber: true,
      status: true,
      startedAt: true,
      expiresAt: true,
      submittedAt: true,
      score: true,
      maxScore: true,
      percentage: true,
      feedback: true,
      gradedAt: true,
      version: true,
      student: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
      exam: {
        select: {
          id: true,
          title: true,
          status: true,
          passingPercentage: true,
          showFeedback: true,
          course: {
            select: {
              id: true,
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
              prompt: true,
              points: true,
              position: true,
              isRequired: true,
              gradingConfig: true,
              type: {
                select: {
                  code: true,
                  name: true,
                  isAutoGradable: true,
                },
              },
              options: {
                orderBy: {
                  position: 'asc',
                },
                select: {
                  id: true,
                  text: true,
                  isCorrect: true,
                  position: true,
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
          booleanValue: true,
          awardedPoints: true,
          feedback: true,
          isAutoGraded: true,
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
      'You cannot review this submission.',
    );
  }

  if (attempt.status === AttemptStatus.IN_PROGRESS) {
    throw new AppError(
      409,
      'ATTEMPT_NOT_SUBMITTED',
      'An in-progress attempt cannot be reviewed.',
    );
  }

  const answersByQuestionId = new Map(
    attempt.answers.map((answer) => [
      answer.questionId,
      answer,
    ]),
  );

  return {
    submission: {
      id: attempt.id,
      attemptNumber: attempt.attemptNumber,
      status: attempt.status,
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
      submittedAt: attempt.submittedAt,
      score: attempt.score,
      maxScore: attempt.maxScore,
      percentage: attempt.percentage,
      feedback: attempt.feedback,
      gradedAt: attempt.gradedAt,
      version: attempt.version,
    },
    student: attempt.student,
    exam: {
      id: attempt.exam.id,
      title: attempt.exam.title,
      status: attempt.exam.status,
      passingPercentage:
        attempt.exam.passingPercentage,
      showFeedback: attempt.exam.showFeedback,
      course: {
        id: attempt.exam.course.id,
        code: attempt.exam.course.code,
        name: attempt.exam.course.name,
      },
    },
    questions: attempt.exam.questions.map(
      (question) => {
        const answer =
          answersByQuestionId.get(question.id);

        return {
          id: question.id,
          prompt: question.prompt,
          points: question.points,
          position: question.position,
          isRequired: question.isRequired,
          gradingConfig: question.gradingConfig,
          type: question.type,
          options: question.options,
          requiresManualGrading:
            !question.type.isAutoGradable,
          answer: answer
            ? {
                id: answer.id,
                textValue: answer.textValue,
                numericValue:
                  answer.numericValue === null
                    ? null
                    : Number(answer.numericValue),
                booleanValue:
                  answer.booleanValue,
                selectedOptionIds:
                  answer.selections.map(
                    (selection) =>
                      selection.optionId,
                  ),
                awardedPoints:
                  answer.awardedPoints,
                feedback: answer.feedback,
                isAutoGraded:
                  answer.isAutoGraded,
                version: answer.version,
              }
            : null,
        };
      },
    ),
  };
}