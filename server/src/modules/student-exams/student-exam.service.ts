import { prisma } from '../../database/prisma.js';
import {
  AttemptStatus,
  EnrollmentStatus,
  ExamStatus,
} from '../../generated/prisma/client.js';

export type StudentExamAvailability =
  | 'UPCOMING'
  | 'AVAILABLE'
  | 'ENDED';

function getAvailabilityStatus(
  startAt: Date | null,
  endAt: Date | null,
  serverTime: Date,
): StudentExamAvailability {
  if (
    startAt &&
    serverTime.getTime() < startAt.getTime()
  ) {
    return 'UPCOMING';
  }

  if (
    endAt &&
    serverTime.getTime() >= endAt.getTime()
  ) {
    return 'ENDED';
  }

  return 'AVAILABLE';
}

export async function listStudentExams(
  studentId: string,
) {
  const serverTime = new Date();

  const exams = await prisma.exam.findMany({
    where: {
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
      status: true,
      startAt: true,
      endAt: true,
      durationMinutes: true,
      maxAttempts: true,
      passingPercentage: true,
      publishedAt: true,
      course: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      _count: {
        select: {
          questions: true,
        },
      },
      attempts: {
        where: {
          studentId,
        },
        orderBy: {
          attemptNumber: 'desc',
        },
        select: {
          id: true,
          attemptNumber: true,
          status: true,
          startedAt: true,
          expiresAt: true,
          submittedAt: true,
        },
      },
    },
    orderBy: [
      {
        startAt: 'asc',
      },
      {
        title: 'asc',
      },
    ],
  });

  return {
    serverTime: serverTime.toISOString(),
    exams: exams.map((exam) => {
      const availabilityStatus =
        getAvailabilityStatus(
          exam.startAt,
          exam.endAt,
          serverTime,
        );

      const activeAttempt = exam.attempts.find(
        (attempt) =>
          attempt.status === AttemptStatus.IN_PROGRESS,
      );

      const attemptsUsed = exam.attempts.length;

      const remainingAttempts = Math.max(
        exam.maxAttempts - attemptsUsed,
        0,
      );

      const canResume =
        availabilityStatus === 'AVAILABLE' &&
        activeAttempt !== undefined &&
        activeAttempt.expiresAt.getTime() >
          serverTime.getTime();

      const canStart =
        availabilityStatus === 'AVAILABLE' &&
        activeAttempt === undefined &&
        remainingAttempts > 0;

      return {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        status: exam.status,
        startAt: exam.startAt,
        endAt: exam.endAt,
        durationMinutes: exam.durationMinutes,
        maxAttempts: exam.maxAttempts,
        passingPercentage: exam.passingPercentage,
        publishedAt: exam.publishedAt,
        course: exam.course,
        questionCount: exam._count.questions,
        attemptsUsed,
        remainingAttempts,
        availabilityStatus,
        canStart,
        canResume,
        activeAttemptId: canResume
          ? activeAttempt.id
          : null,
        latestAttempt: exam.attempts[0] ?? null,
      };
    }),
  };
}