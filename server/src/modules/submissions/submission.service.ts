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