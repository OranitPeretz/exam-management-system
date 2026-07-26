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
import { UserRole } from '../src/generated/prisma/client.js';
import {
    ACCESS_TOKEN_AUDIENCE,
    ACCESS_TOKEN_ISSUER,
} from '../src/modules/auth/auth.constants.js';

const examServiceMocks = vi.hoisted(() => ({
    listAvailableCourses: vi.fn(),
    listManagedExams: vi.fn(),
    createExam: vi.fn(),
    getManagedExamDetails: vi.fn(),
    updateManagedExam: vi.fn(),
    deleteManagedExam: vi.fn(),
}));

const questionServiceMocks = vi.hoisted(() => ({
    listQuestionTypes: vi.fn(),
    createQuestion: vi.fn(),
    updateQuestion: vi.fn(),
    deleteQuestion: vi.fn(),
}));

const publicationServiceMocks = vi.hoisted(() => ({
    publishExam: vi.fn(),
}));

vi.mock(
    '../src/modules/exams/exam.service.js',
    () => examServiceMocks,
);

vi.mock(
    '../src/modules/questions/question.service.js',
    () => questionServiceMocks,
);

vi.mock(
    '../src/modules/exams/exam-publication.service.js',
    () => publicationServiceMocks,
);

const lecturerActor = {
    userId: 'lecturer-test-user',
    role: UserRole.LECTURER,
};

function createLecturerAccessToken(): string {
    return jwt.sign(
        {
            role: lecturerActor.role,
        },
        env.JWT_ACCESS_SECRET,
        {
            subject: lecturerActor.userId,
            issuer: ACCESS_TOKEN_ISSUER,
            audience: ACCESS_TOKEN_AUDIENCE,
            expiresIn: '15m',
        },
    );
}

function getAuthorizationHeader(): string {
    return `Bearer ${createLecturerAccessToken()}`;
}

describe('Lecturer exam management API', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns the courses available to the lecturer', async () => {
        const courses = [
            {
                id: 'course-1',
                code: 'WEB101',
                name: 'Web Application Development',
            },
        ];

        examServiceMocks.listAvailableCourses.mockResolvedValue(
            courses,
        );

        const response = await request(app)
            .get('/api/v1/lecturer/courses')
            .set('Authorization', getAuthorizationHeader());

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            data: {
                courses,
            },
        });

        expect(
            examServiceMocks.listAvailableCourses,
        ).toHaveBeenCalledWith(lecturerActor);
    });

    it('returns the exams managed by the lecturer', async () => {
        const exams = [
            {
                id: 'exam-1',
                title: 'Operating Systems Final Exam',
                status: 'DRAFT',
            },
        ];

        examServiceMocks.listManagedExams.mockResolvedValue(
            exams,
        );

        const response = await request(app)
            .get('/api/v1/lecturer/exams')
            .set('Authorization', getAuthorizationHeader());

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            data: {
                exams,
            },
        });

        expect(
            examServiceMocks.listManagedExams,
        ).toHaveBeenCalledWith(lecturerActor);
    });

    it('creates a valid exam', async () => {
        const requestBody = {
            courseId: 'course-1',
            title: 'Operating Systems Final Exam',
            description:
                'A final assessment covering operating systems.',
            instructions: 'Answer all questions.',
            startAt: '2026-08-01T08:00:00.000Z',
            endAt: '2026-08-01T10:00:00.000Z',
            durationMinutes: 60,
            maxAttempts: 1,
            passingPercentage: 60,
            shuffleQuestions: true,
            showFeedback: true,
        };

        const createdExam = {
            id: 'exam-1',
            ...requestBody,
            status: 'DRAFT',
            version: 1,
        };

        examServiceMocks.createExam.mockResolvedValue(
            createdExam,
        );

        const response = await request(app)
            .post('/api/v1/lecturer/exams')
            .set('Authorization', getAuthorizationHeader())
            .send(requestBody);

        expect(response.status).toBe(201);
        expect(response.body).toEqual({
            data: {
                exam: createdExam,
            },
        });

        expect(
            examServiceMocks.createExam,
        ).toHaveBeenCalledWith(
            lecturerActor,
            requestBody,
        );
    });

    it('rejects an invalid exam request body', async () => {
        const response = await request(app)
            .post('/api/v1/lecturer/exams')
            .set('Authorization', getAuthorizationHeader())
            .send({
                title: 'No',
                durationMinutes: 0,
            });

        expect(response.status).toBe(400);
        expect(response.body.error).toBeDefined();
        expect(
            examServiceMocks.createExam,
        ).not.toHaveBeenCalled();
    });

    it('returns the details of a managed exam', async () => {
        const exam = {
            id: 'exam-1',
            title: 'Operating Systems Final Exam',
            status: 'DRAFT',
            questions: [],
        };

        examServiceMocks.getManagedExamDetails.mockResolvedValue(
            exam,
        );

        const response = await request(app)
            .get('/api/v1/lecturer/exams/exam-1')
            .set('Authorization', getAuthorizationHeader());

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            data: {
                exam,
            },
        });

        expect(
            examServiceMocks.getManagedExamDetails,
        ).toHaveBeenCalledWith(
            lecturerActor,
            'exam-1',
        );
    });

    it('updates a managed exam', async () => {
        const requestBody = {
            title: 'Updated Operating Systems Exam',
            durationMinutes: 75,
        };

        const updatedExam = {
            id: 'exam-1',
            ...requestBody,
            status: 'DRAFT',
            version: 2,
        };

        examServiceMocks.updateManagedExam.mockResolvedValue(
            updatedExam,
        );

        const response = await request(app)
            .patch('/api/v1/lecturer/exams/exam-1')
            .set('Authorization', getAuthorizationHeader())
            .send(requestBody);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            data: {
                exam: updatedExam,
            },
        });

        expect(
            examServiceMocks.updateManagedExam,
        ).toHaveBeenCalledWith(
            lecturerActor,
            'exam-1',
            requestBody,
        );
    });

    it('deletes a managed exam', async () => {
        examServiceMocks.deleteManagedExam.mockResolvedValue(
            undefined,
        );

        const response = await request(app)
            .delete('/api/v1/lecturer/exams/exam-1')
            .set('Authorization', getAuthorizationHeader());

        expect(response.status).toBe(204);
        expect(response.text).toBe('');

        expect(
            examServiceMocks.deleteManagedExam,
        ).toHaveBeenCalledWith(
            lecturerActor,
            'exam-1',
        );
    });

    it('returns the available question types', async () => {
        const questionTypes = [
            {
                code: 'SINGLE_CHOICE',
                name: 'Single Choice',
                isAutoGradable: true,
            },
            {
                code: 'LONG_TEXT',
                name: 'Long Text',
                isAutoGradable: false,
            },
        ];

        questionServiceMocks.listQuestionTypes.mockResolvedValue(
            questionTypes,
        );

        const response = await request(app)
            .get('/api/v1/lecturer/question-types')
            .set('Authorization', getAuthorizationHeader());

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            data: {
                questionTypes,
            },
        });

        expect(
            questionServiceMocks.listQuestionTypes,
        ).toHaveBeenCalledOnce();
    });

    it('creates a question for a draft exam', async () => {
        const requestBody = {
            typeCode: 'SINGLE_CHOICE',
            prompt:
                'Which CPU scheduling algorithm uses time slices?',
            points: 10,
            isRequired: true,
            options: [
                {
                    text: 'Round Robin',
                    isCorrect: true,
                },
                {
                    text: 'First Come First Served',
                    isCorrect: false,
                },
                {
                    text: 'Shortest Job First',
                    isCorrect: false,
                },
            ],
        };

        const createdQuestion = {
            id: 'question-1',
            ...requestBody,
            position: 1,
        };

        questionServiceMocks.createQuestion.mockResolvedValue(
            createdQuestion,
        );

        const response = await request(app)
            .post(
                '/api/v1/lecturer/exams/exam-1/questions',
            )
            .set('Authorization', getAuthorizationHeader())
            .send(requestBody);

        expect(response.status).toBe(201);
        expect(response.body).toEqual({
            data: {
                question: createdQuestion,
            },
        });

        expect(
            questionServiceMocks.createQuestion,
        ).toHaveBeenCalledWith(
            lecturerActor,
            'exam-1',
            requestBody,
        );
    });

    it('updates a question in a draft exam', async () => {
        const requestBody = {
            typeCode: 'SINGLE_CHOICE',
            prompt:
                'Which scheduling algorithm uses fixed time slices?',
            points: 12,
            isRequired: true,
            options: [
                {
                    text: 'Round Robin',
                    isCorrect: true,
                },
                {
                    text: 'First Come First Served',
                    isCorrect: false,
                },
                {
                    text: 'Shortest Job First',
                    isCorrect: false,
                },
            ],
        };

        const updatedQuestion = {
            id: 'question-1',
            typeCode: requestBody.typeCode,
            prompt: requestBody.prompt,
            points: requestBody.points,
            isRequired: requestBody.isRequired,
            options: requestBody.options,
            position: 1,
            version: 2,
        };

        questionServiceMocks.updateQuestion.mockResolvedValue(
            updatedQuestion,
        );

        const response = await request(app)
            .put(
                '/api/v1/lecturer/exams/exam-1/questions/question-1',
            )
            .set('Authorization', getAuthorizationHeader())
            .send(requestBody);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            data: {
                question: updatedQuestion,
            },
        });

        expect(
            questionServiceMocks.updateQuestion,
        ).toHaveBeenCalledWith(
            lecturerActor,
            'exam-1',
            'question-1',
            requestBody,
        );
    });

    it('deletes a question from a draft exam', async () => {
        questionServiceMocks.deleteQuestion.mockResolvedValue(
            undefined,
        );

        const response = await request(app)
            .delete(
                '/api/v1/lecturer/exams/exam-1/questions/question-1',
            )
            .set('Authorization', getAuthorizationHeader());

        expect(response.status).toBe(204);
        expect(response.text).toBe('');

        expect(
            questionServiceMocks.deleteQuestion,
        ).toHaveBeenCalledWith(
            lecturerActor,
            'exam-1',
            'question-1',
        );
    });

    it('publishes a valid draft exam', async () => {
        const publishedExam = {
            id: 'exam-1',
            title: 'Operating Systems Final Exam',
            status: 'PUBLISHED',
            publishedAt: '2026-08-01T07:00:00.000Z',
            version: 2,
        };

        publicationServiceMocks.publishExam.mockResolvedValue(
            publishedExam,
        );

        const response = await request(app)
            .post('/api/v1/lecturer/exams/exam-1/publish')
            .set('Authorization', getAuthorizationHeader());

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            data: {
                exam: publishedExam,
            },
        });

        expect(
            publicationServiceMocks.publishExam,
        ).toHaveBeenCalledWith(
            lecturerActor,
            'exam-1',
        );
    });
});