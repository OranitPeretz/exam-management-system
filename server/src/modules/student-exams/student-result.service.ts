import { prisma } from '../../database/prisma.js';
import {
  AttemptStatus,
  ExamStatus,
} from '../../generated/prisma/client.js';

export async function listStudentResults(
  studentId: string,
) {
  const results =
    await prisma.examAttempt.findMany({
      where: {
        studentId,
        status: AttemptStatus.GRADED,
        exam: {
          is: {
            status:
              ExamStatus.RESULTS_PUBLISHED,
          },
        },
      },
      orderBy: [
        {
          gradedAt: 'desc',
        },
        {
          submittedAt: 'desc',
        },
      ],
      select: {
        id: true,
        attemptNumber: true,
        status: true,
        submittedAt: true,
        score: true,
        maxScore: true,
        percentage: true,
        feedback: true,
        gradedAt: true,
        exam: {
          select: {
            id: true,
            title: true,
            description: true,
            passingPercentage: true,
            showFeedback: true,
            resultsPublishedAt: true,
            course: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
      },
    });

  return results.map((result) => {
    const percentage = result.percentage ?? 0;

    return {
      attemptId: result.id,
      attemptNumber: result.attemptNumber,
      status: result.status,
      submittedAt: result.submittedAt,
      gradedAt: result.gradedAt,
      score: result.score,
      maxScore: result.maxScore,
      percentage,
      passed:
        percentage >=
        result.exam.passingPercentage,
      feedback: result.exam.showFeedback
        ? result.feedback
        : null,
      feedbackAvailable:
        result.exam.showFeedback,
      exam: {
        id: result.exam.id,
        title: result.exam.title,
        description:
          result.exam.description,
        passingPercentage:
          result.exam.passingPercentage,
        resultsPublishedAt:
          result.exam.resultsPublishedAt,
        course: result.exam.course,
      },
    };
  });
}