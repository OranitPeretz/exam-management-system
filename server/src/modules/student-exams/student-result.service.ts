import { prisma } from '../../database/prisma.js';
import {
  AttemptStatus,
  ExamStatus,
} from '../../generated/prisma/client.js';
import { AppError } from '../../errors/app-error.js';

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

export async function getStudentResultDetails(
  studentId: string,
  attemptId: string,
) {
  const result =
    await prisma.examAttempt.findFirst({
      where: {
        id: attemptId,
        studentId,
        status: AttemptStatus.GRADED,
        exam: {
          is: {
            status:
              ExamStatus.RESULTS_PUBLISHED,
          },
        },
      },
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
        exam: {
          select: {
            id: true,
            title: true,
            description: true,
            instructions: true,
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
            questions: {
              orderBy: {
                position: 'asc',
              },
              select: {
                id: true,
                prompt: true,
                points: true,
                position: true,
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
                    position: true,
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
            booleanValue: true,
            awardedPoints: true,
            feedback: true,
            isAutoGraded: true,
            selections: {
              select: {
                optionId: true,
              },
            },
          },
        },
      },
    });

  if (!result) {
    throw new AppError(
      404,
      'PUBLISHED_RESULT_NOT_FOUND',
      'The requested published result was not found.',
    );
  }

  const answersByQuestionId = new Map(
    result.answers.map((answer) => [
      answer.questionId,
      answer,
    ]),
  );

  const percentage = result.percentage ?? 0;
  const showFeedback = result.exam.showFeedback;

  return {
    result: {
      attemptId: result.id,
      attemptNumber: result.attemptNumber,
      status: result.status,
      startedAt: result.startedAt,
      submittedAt: result.submittedAt,
      gradedAt: result.gradedAt,
      score: result.score,
      maxScore: result.maxScore,
      percentage,
      passed:
        percentage >=
        result.exam.passingPercentage,
      feedback: showFeedback
        ? result.feedback
        : null,
      feedbackAvailable: showFeedback,
    },
    exam: {
      id: result.exam.id,
      title: result.exam.title,
      description: result.exam.description,
      instructions: result.exam.instructions,
      passingPercentage:
        result.exam.passingPercentage,
      resultsPublishedAt:
        result.exam.resultsPublishedAt,
      course: result.exam.course,
    },
    questions: result.exam.questions.map(
      (question) => {
        const answer =
          answersByQuestionId.get(question.id);

        return {
          id: question.id,
          prompt: question.prompt,
          points: question.points,
          position: question.position,
          type: question.type,
          gradingConfig: showFeedback
            ? question.gradingConfig
            : null,
          options: question.options.map(
            (option) => ({
              id: option.id,
              text: option.text,
              position: option.position,
              ...(showFeedback && {
                isCorrect: option.isCorrect,
              }),
            }),
          ),
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
                feedback: showFeedback
                  ? answer.feedback
                  : null,
                isAutoGraded:
                  answer.isAutoGraded,
              }
            : null,
        };
      },
    ),
  };
}