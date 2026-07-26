import jwt from 'jsonwebtoken';
import request from 'supertest';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { app } from '../src/app.js';
import { env } from '../src/config/env.js';
import { AppError } from '../src/errors/app-error.js';
import { UserRole } from '../src/generated/prisma/client.js';
import {
  ACCESS_TOKEN_AUDIENCE,
  ACCESS_TOKEN_ISSUER,
} from '../src/modules/auth/auth.constants.js';

const studentResultServiceMocks = vi.hoisted(() => ({
  listStudentResults: vi.fn(),
  getStudentResultDetails: vi.fn(),
}));

const submissionServiceMocks = vi.hoisted(() => ({
  listExamSubmissions: vi.fn(),
  getSubmissionDetails: vi.fn(),
}));

const gradingServiceMocks = vi.hoisted(() => ({
  gradeSubmission: vi.fn(),
}));

const resultsPublicationServiceMocks = vi.hoisted(() => ({
  publishExamResults: vi.fn(),
}));

vi.mock(
  '../src/modules/student-exams/student-result.service.js',
  () => studentResultServiceMocks,
);

vi.mock(
  '../src/modules/submissions/submission.service.js',
  () => submissionServiceMocks,
);

vi.mock(
  '../src/modules/submissions/grading.service.js',
  () => gradingServiceMocks,
);

vi.mock(
  '../src/modules/submissions/results-publication.service.js',
  () => resultsPublicationServiceMocks,
);

const studentActor = {
  userId: 'student-test-user',
  role: UserRole.STUDENT,
};

const lecturerActor = {
  userId: 'lecturer-test-user',
  role: UserRole.LECTURER,
};

function createAccessToken(
  userId: string,
  role: UserRole,
): string {
  return jwt.sign(
    {
      role,
    },
    env.JWT_ACCESS_SECRET,
    {
      subject: userId,
      issuer: ACCESS_TOKEN_ISSUER,
      audience: ACCESS_TOKEN_AUDIENCE,
      expiresIn: '15m',
    },
  );
}

function getStudentAuthorizationHeader(): string {
  return `Bearer ${createAccessToken(
    studentActor.userId,
    studentActor.role,
  )}`;
}

function getLecturerAuthorizationHeader(): string {
  return `Bearer ${createAccessToken(
    lecturerActor.userId,
    lecturerActor.role,
  )}`;
}

describe('Student results API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the published results of the student', async () => {
    const results = [
      {
        attemptId: 'attempt-1',
        attemptNumber: 1,
        score: 9,
        maxScore: 10,
        percentage: 90,
        passed: true,
        feedback: 'Good work overall.',
        exam: {
          id: 'exam-1',
          title: 'Full Stack Fundamentals',
          passingPercentage: 60,
          course: {
            code: 'WEB101',
            name: 'Web Application Development',
          },
        },
      },
    ];

    studentResultServiceMocks.listStudentResults
      .mockResolvedValue(results);

    const response = await request(app)
      .get('/api/v1/student/results')
      .set(
        'Authorization',
        getStudentAuthorizationHeader(),
      );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: {
        results,
      },
    });

    expect(
      studentResultServiceMocks.listStudentResults,
    ).toHaveBeenCalledWith(studentActor.userId);
  });

  it('returns detailed published result information', async () => {
    const result = {
      result: {
        attemptId: 'attempt-1',
        attemptNumber: 1,
        status: 'GRADED',
        score: 9,
        maxScore: 10,
        percentage: 90,
        passed: true,
        feedback: 'Good work overall.',
        feedbackAvailable: true,
      },
      exam: {
        id: 'exam-1',
        title: 'Full Stack Fundamentals',
        passingPercentage: 60,
        course: {
          code: 'WEB101',
          name: 'Web Application Development',
        },
      },
      questions: [
        {
          id: 'question-1',
          position: 1,
          prompt:
            'Which HTTP method creates a resource?',
          points: 3,
          type: {
            code: 'SINGLE_CHOICE',
            name: 'Single Choice',
          },
          options: [
            {
              id: 'option-1',
              text: 'POST',
              isCorrect: true,
              position: 1,
            },
          ],
          answer: {
            selectedOptionIds: ['option-1'],
            awardedPoints: 3,
            feedback: null,
          },
        },
      ],
    };

    studentResultServiceMocks.getStudentResultDetails
      .mockResolvedValue(result);

    const response = await request(app)
      .get('/api/v1/student/results/attempt-1')
      .set(
        'Authorization',
        getStudentAuthorizationHeader(),
      );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: result,
    });

    expect(
      studentResultServiceMocks.getStudentResultDetails,
    ).toHaveBeenCalledWith(
      studentActor.userId,
      'attempt-1',
    );
  });
});

describe('Lecturer grading API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns submissions for a managed exam', async () => {
    const result = {
      exam: {
        id: 'exam-1',
        title: 'Full Stack Fundamentals',
        status: 'PUBLISHED',
        totalPoints: 10,
      },
      summary: {
        totalSubmissions: 1,
        waitingForGrading: 1,
        graded: 0,
      },
      submissions: [
        {
          id: 'attempt-1',
          attemptNumber: 1,
          status: 'GRADING',
          answeredQuestions: 3,
          score: 6,
          maxScore: 10,
          percentage: null,
          student: {
            id: 'student-1',
            email: 'student@example.com',
            firstName: 'Noa',
            lastName: 'Levi',
          },
        },
      ],
    };

    submissionServiceMocks.listExamSubmissions
      .mockResolvedValue(result);

    const response = await request(app)
      .get(
        '/api/v1/lecturer/exams/exam-1/submissions',
      )
      .set(
        'Authorization',
        getLecturerAuthorizationHeader(),
      );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: result,
    });

    expect(
      submissionServiceMocks.listExamSubmissions,
    ).toHaveBeenCalledWith(
      lecturerActor,
      'exam-1',
    );
  });

  it('returns the details of a student submission', async () => {
    const result = {
      submission: {
        id: 'attempt-1',
        attemptNumber: 1,
        status: 'GRADING',
        score: 6,
        maxScore: 10,
        percentage: null,
        feedback: null,
        version: 6,
      },
      student: {
        id: 'student-1',
        email: 'student@example.com',
        firstName: 'Noa',
        lastName: 'Levi',
      },
      exam: {
        id: 'exam-1',
        title: 'Full Stack Fundamentals',
      },
      questions: [
        {
          id: 'question-3',
          position: 3,
          prompt:
            'Explain authentication and authorization.',
          points: 4,
          requiresManualGrading: true,
          type: {
            code: 'LONG_TEXT',
            name: 'Long Text',
          },
          answer: {
            id: 'answer-3',
            textValue:
              'Authentication verifies identity.',
            awardedPoints: null,
            feedback: null,
            isAutoGraded: false,
          },
        },
      ],
    };

    submissionServiceMocks.getSubmissionDetails
      .mockResolvedValue(result);

    const response = await request(app)
      .get('/api/v1/lecturer/attempts/attempt-1')
      .set(
        'Authorization',
        getLecturerAuthorizationHeader(),
      );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: result,
    });

    expect(
      submissionServiceMocks.getSubmissionDetails,
    ).toHaveBeenCalledWith(
      lecturerActor,
      'attempt-1',
    );
  });

  it('grades a student submission manually', async () => {
    const requestBody = {
      version: 6,
      feedback: 'Good work overall.',
      answers: [
        {
          questionId: 'question-3',
          awardedPoints: 3,
          feedback:
            'The answer demonstrates a basic understanding.',
        },
      ],
    };

    const result = {
      submission: {
        id: 'attempt-1',
        attemptNumber: 1,
        status: 'GRADED',
        score: 9,
        maxScore: 10,
        percentage: 90,
        feedback: 'Good work overall.',
        version: 7,
      },
      questions: [
        {
          id: 'question-3',
          requiresManualGrading: true,
          answer: {
            awardedPoints: 3,
            feedback:
              'The answer demonstrates a basic understanding.',
            isAutoGraded: false,
          },
        },
      ],
    };

    gradingServiceMocks.gradeSubmission
      .mockResolvedValue(result);

    const response = await request(app)
      .put(
        '/api/v1/lecturer/attempts/attempt-1/grade',
      )
      .set(
        'Authorization',
        getLecturerAuthorizationHeader(),
      )
      .send(requestBody);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: result,
    });

    expect(
      gradingServiceMocks.gradeSubmission,
    ).toHaveBeenCalledWith(
      lecturerActor,
      'attempt-1',
      requestBody,
    );
  });

  it('rejects duplicate question grades', async () => {
    const response = await request(app)
      .put(
        '/api/v1/lecturer/attempts/attempt-1/grade',
      )
      .set(
        'Authorization',
        getLecturerAuthorizationHeader(),
      )
      .send({
        version: 6,
        answers: [
          {
            questionId: 'question-3',
            awardedPoints: 3,
          },
          {
            questionId: 'question-3',
            awardedPoints: 4,
          },
        ],
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();

    expect(
      gradingServiceMocks.gradeSubmission,
    ).not.toHaveBeenCalled();
  });

  it('publishes the graded results of an exam', async () => {
    const result = {
      exam: {
        id: 'exam-1',
        title: 'Full Stack Fundamentals',
        status: 'RESULTS_PUBLISHED',
        resultsPublishedAt:
          '2026-08-01T12:00:00.000Z',
        version: 2,
      },
      gradedAttempts: 1,
      notifiedStudents: 1,
      message:
        'Exam results were published successfully.',
    };

    resultsPublicationServiceMocks.publishExamResults
      .mockResolvedValue(result);

    const response = await request(app)
      .post(
        '/api/v1/lecturer/exams/exam-1/results/publish',
      )
      .set(
        'Authorization',
        getLecturerAuthorizationHeader(),
      );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: result,
    });

    expect(
      resultsPublicationServiceMocks.publishExamResults,
    ).toHaveBeenCalledWith(
      lecturerActor,
      'exam-1',
    );
  });

  it('returns a conflict when results cannot be published', async () => {
    resultsPublicationServiceMocks.publishExamResults
      .mockRejectedValue(
        new AppError(
          409,
          'SUBMISSIONS_REQUIRE_GRADING',
          'All submissions must be graded before publishing results.',
        ),
      );

    const response = await request(app)
      .post(
        '/api/v1/lecturer/exams/exam-1/results/publish',
      )
      .set(
        'Authorization',
        getLecturerAuthorizationHeader(),
      );

    expect(response.status).toBe(409);
    expect(response.body.error).toEqual({
      code: 'SUBMISSIONS_REQUIRE_GRADING',
      message:
        'All submissions must be graded before publishing results.',
    });
  });
});