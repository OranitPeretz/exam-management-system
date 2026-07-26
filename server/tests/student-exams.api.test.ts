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

const studentExamServiceMocks = vi.hoisted(() => ({
  listStudentExams: vi.fn(),
}));

const studentAttemptServiceMocks = vi.hoisted(() => ({
  startOrResumeStudentAttempt: vi.fn(),
}));

const studentAnswerServiceMocks = vi.hoisted(() => ({
  saveStudentAnswer: vi.fn(),
}));

const studentSubmissionServiceMocks = vi.hoisted(() => ({
  submitStudentAttempt: vi.fn(),
}));

vi.mock(
  '../src/modules/student-exams/student-exam.service.js',
  () => studentExamServiceMocks,
);

vi.mock(
  '../src/modules/student-exams/student-attempt.service.js',
  () => studentAttemptServiceMocks,
);

vi.mock(
  '../src/modules/student-exams/student-answer.service.js',
  () => studentAnswerServiceMocks,
);

vi.mock(
  '../src/modules/student-exams/student-submission.service.js',
  () => studentSubmissionServiceMocks,
);

const studentId = 'student-test-user';

function createStudentAccessToken(): string {
  return jwt.sign(
    {
      role: UserRole.STUDENT,
    },
    env.JWT_ACCESS_SECRET,
    {
      subject: studentId,
      issuer: ACCESS_TOKEN_ISSUER,
      audience: ACCESS_TOKEN_AUDIENCE,
      expiresIn: '15m',
    },
  );
}

function getAuthorizationHeader(): string {
  return `Bearer ${createStudentAccessToken()}`;
}

describe('Student exam workflow API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the exams available to the student', async () => {
    const result = {
      exams: [
        {
          id: 'exam-1',
          title: 'Operating Systems Final Exam',
          availabilityStatus: 'AVAILABLE',
          questionCount: 3,
          attemptsUsed: 0,
          remainingAttempts: 1,
          canStart: true,
          canResume: false,
        },
      ],
    };

    studentExamServiceMocks.listStudentExams.mockResolvedValue(
      result,
    );

    const response = await request(app)
      .get('/api/v1/student/exams')
      .set('Authorization', getAuthorizationHeader());

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: result,
    });

    expect(
      studentExamServiceMocks.listStudentExams,
    ).toHaveBeenCalledWith(studentId);
  });

  it('starts a new student attempt', async () => {
    const result = {
      resumed: false,
      remainingSeconds: 3600,
      attempt: {
        id: 'attempt-1',
        attemptNumber: 1,
        status: 'IN_PROGRESS',
        expiresAt: '2026-08-01T10:00:00.000Z',
      },
      exam: {
        id: 'exam-1',
        title: 'Operating Systems Final Exam',
        durationMinutes: 60,
        questions: [
          {
            id: 'question-1',
            position: 1,
            prompt:
              'Which scheduling algorithm uses time slices?',
            points: 10,
            type: {
              code: 'SINGLE_CHOICE',
              name: 'Single Choice',
            },
            options: [
              {
                id: 'option-1',
                text: 'Round Robin',
                position: 1,
              },
              {
                id: 'option-2',
                text: 'First Come First Served',
                position: 2,
              },
            ],
          },
        ],
      },
    };

    studentAttemptServiceMocks.startOrResumeStudentAttempt
      .mockResolvedValue(result);

    const response = await request(app)
      .post('/api/v1/student/exams/exam-1/attempts')
      .set('Authorization', getAuthorizationHeader());

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      data: result,
    });

    expect(
      studentAttemptServiceMocks.startOrResumeStudentAttempt,
    ).toHaveBeenCalledWith(
      studentId,
      'exam-1',
    );
  });

  it('resumes an existing student attempt', async () => {
    const result = {
      resumed: true,
      remainingSeconds: 2400,
      attempt: {
        id: 'attempt-1',
        attemptNumber: 1,
        status: 'IN_PROGRESS',
        expiresAt: '2026-08-01T10:00:00.000Z',
      },
      exam: {
        id: 'exam-1',
        title: 'Operating Systems Final Exam',
        durationMinutes: 60,
        questions: [],
      },
    };

    studentAttemptServiceMocks.startOrResumeStudentAttempt
      .mockResolvedValue(result);

    const response = await request(app)
      .post('/api/v1/student/exams/exam-1/attempts')
      .set('Authorization', getAuthorizationHeader());

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: result,
    });

    expect(
      studentAttemptServiceMocks.startOrResumeStudentAttempt,
    ).toHaveBeenCalledWith(
      studentId,
      'exam-1',
    );
  });

  it('returns a conflict when an exam cannot be started', async () => {
    studentAttemptServiceMocks.startOrResumeStudentAttempt
      .mockRejectedValue(
        new AppError(
          409,
          'EXAM_NOT_AVAILABLE',
          'The exam is not currently available.',
        ),
      );

    const response = await request(app)
      .post('/api/v1/student/exams/exam-1/attempts')
      .set('Authorization', getAuthorizationHeader());

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: {
        code: 'EXAM_NOT_AVAILABLE',
        message:
          'The exam is not currently available.',
      },
    });
  });

  it('saves a student answer', async () => {
    const requestBody = {
      selectedOptionIds: ['option-1'],
    };

    const result = {
      answer: {
        questionId: 'question-1',
        textValue: null,
        numericValue: null,
        booleanValue: null,
        selectedOptionIds: ['option-1'],
        version: 1,
      },
    };

    studentAnswerServiceMocks.saveStudentAnswer
      .mockResolvedValue(result);

    const response = await request(app)
      .put(
        '/api/v1/student/attempts/attempt-1/answers/question-1',
      )
      .set('Authorization', getAuthorizationHeader())
      .send(requestBody);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: result,
    });

    expect(
      studentAnswerServiceMocks.saveStudentAnswer,
    ).toHaveBeenCalledWith(
      studentId,
      'attempt-1',
      'question-1',
      requestBody,
    );
  });

  it('rejects an invalid student answer body', async () => {
    const response = await request(app)
      .put(
        '/api/v1/student/attempts/attempt-1/answers/question-1',
      )
      .set('Authorization', getAuthorizationHeader())
      .send({
        selectedOptionIds: 'option-1',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();

    expect(
      studentAnswerServiceMocks.saveStudentAnswer,
    ).not.toHaveBeenCalled();
  });

  it('submits a student attempt', async () => {
    const result = {
      attempt: {
        id: 'attempt-1',
        attemptNumber: 1,
        status: 'GRADED',
        submittedAt: '2026-08-01T09:30:00.000Z',
      },
      answeredQuestions: 3,
      totalQuestions: 3,
      requiresManualGrading: false,
      wasAutomaticallySubmitted: false,
      message:
        'The exam was submitted and graded. Results will be available after publication by the lecturer.',
    };

    studentSubmissionServiceMocks.submitStudentAttempt
      .mockResolvedValue(result);

    const response = await request(app)
      .post(
        '/api/v1/student/attempts/attempt-1/submit',
      )
      .set('Authorization', getAuthorizationHeader());

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: result,
    });

    expect(
      studentSubmissionServiceMocks.submitStudentAttempt,
    ).toHaveBeenCalledWith(
      studentId,
      'attempt-1',
    );
  });
});