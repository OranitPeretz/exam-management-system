import jwt from 'jsonwebtoken';
import request from 'supertest';
import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

const adminUserServiceMocks = vi.hoisted(
  () => ({
    listManagedUsers: vi.fn(),
    createManagedUser: vi.fn(),
    updateManagedUserStatus: vi.fn(),
  }),
);

const adminCourseServiceMocks = vi.hoisted(
  () => ({
    listManagedCourses: vi.fn(),
    createManagedCourse: vi.fn(),
    enrollStudentInCourse: vi.fn(),
    dropStudentFromCourse: vi.fn(),
  }),
);

vi.mock(
  '../src/modules/admin/admin-user.service.js',
  () => adminUserServiceMocks,
);

vi.mock(
  '../src/modules/admin/admin-course.service.js',
  () => adminCourseServiceMocks,
);

import { app } from '../src/app.js';
import { env } from '../src/config/env.js';
import { prisma } from '../src/database/prisma.js';
import {
  ACCESS_TOKEN_AUDIENCE,
  ACCESS_TOKEN_ISSUER,
} from '../src/modules/auth/auth.constants.js';

function createAdminToken(): string {
  return jwt.sign(
    {
      role: 'ADMIN',
    },
    env.JWT_ACCESS_SECRET,
    {
      subject: 'test-admin-id',
      issuer: ACCESS_TOKEN_ISSUER,
      audience: ACCESS_TOKEN_AUDIENCE,
      expiresIn: '15m',
    },
  );
}

const adminToken = createAdminToken();

const managedUser = {
  id: 'test-student-id',
  email: 'new.student@example.com',
  firstName: 'New',
  lastName: 'Student',
  role: 'STUDENT',
  isActive: true,
  createdAt:
    '2026-07-26T10:00:00.000Z',
  updatedAt:
    '2026-07-26T10:00:00.000Z',
  _count: {
    enrollments: 0,
    coursesTaught: 0,
  },
};

const managedCourse = {
  id: 'test-course-id',
  code: 'DB201',
  name: 'Database Systems',
  description:
    'Database design and SQL.',
  lecturerId: 'test-lecturer-id',
  isActive: true,
  createdAt:
    '2026-07-26T10:00:00.000Z',
  updatedAt:
    '2026-07-26T10:00:00.000Z',
  lecturer: {
    id: 'test-lecturer-id',
    email: 'lecturer@example.com',
    firstName: 'Test',
    lastName: 'Lecturer',
    isActive: true,
  },
  enrollments: [],
  _count: {
    enrollments: 0,
    exams: 0,
  },
};

const managedEnrollment = {
  id: 'test-enrollment-id',
  courseId: 'test-course-id',
  studentId: 'test-student-id',
  status: 'ACTIVE',
  createdAt:
    '2026-07-26T10:00:00.000Z',
  updatedAt:
    '2026-07-26T10:00:00.000Z',
  course: {
    id: 'test-course-id',
    code: 'DB201',
    name: 'Database Systems',
  },
  student: {
    id: 'test-student-id',
    email: 'new.student@example.com',
    firstName: 'New',
    lastName: 'Student',
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Admin academic management API', () => {
  it('lists managed users for an admin', async () => {
    adminUserServiceMocks
      .listManagedUsers
      .mockResolvedValueOnce({
        users: [managedUser],
        total: 1,
      });

    const response = await request(app)
      .get('/api/v1/admin/users')
      .set(
        'Authorization',
        `Bearer ${adminToken}`,
      );

    expect(response.status).toBe(200);
    expect(response.body.data.total).toBe(1);
    expect(response.body.data.users).toEqual([
      managedUser,
    ]);

    expect(
      adminUserServiceMocks.listManagedUsers,
    ).toHaveBeenCalledWith({});
  });

  it('creates a student account', async () => {
    adminUserServiceMocks
      .createManagedUser
      .mockResolvedValueOnce(managedUser);

    const response = await request(app)
      .post('/api/v1/admin/users')
      .set(
        'Authorization',
        `Bearer ${adminToken}`,
      )
      .send({
        email:
          '  NEW.STUDENT@EXAMPLE.COM ',
        firstName: 'New',
        lastName: 'Student',
        role: 'STUDENT',
        password: 'Student456!',
      });

    expect(response.status).toBe(201);
    expect(response.body.data.user).toEqual(
      managedUser,
    );

    expect(
      adminUserServiceMocks.createManagedUser,
    ).toHaveBeenCalledWith(
      {
        email: 'new.student@example.com',
        firstName: 'New',
        lastName: 'Student',
        role: 'STUDENT',
        password: 'Student456!',
      },
      'test-admin-id',
      expect.any(String),
    );
  });

  it('rejects creation of another admin account', async () => {
    const response = await request(app)
      .post('/api/v1/admin/users')
      .set(
        'Authorization',
        `Bearer ${adminToken}`,
      )
      .send({
        email: 'admin2@example.com',
        firstName: 'Second',
        lastName: 'Admin',
        role: 'ADMIN',
        password: 'Admin456!',
      });

    expect(response.status).toBe(400);

    expect(
      adminUserServiceMocks.createManagedUser,
    ).not.toHaveBeenCalled();
  });

  it('updates a managed user status', async () => {
    adminUserServiceMocks
      .updateManagedUserStatus
      .mockResolvedValueOnce({
        ...managedUser,
        isActive: false,
      });

    const response = await request(app)
      .patch(
        '/api/v1/admin/users/test-student-id/status',
      )
      .set(
        'Authorization',
        `Bearer ${adminToken}`,
      )
      .send({
        isActive: false,
      });

    expect(response.status).toBe(200);
    expect(
      response.body.data.user.isActive,
    ).toBe(false);

    expect(
      adminUserServiceMocks
        .updateManagedUserStatus,
    ).toHaveBeenCalledWith(
      'test-student-id',
      false,
      'test-admin-id',
      expect.any(String),
    );
  });

  it('creates a course and normalizes its code', async () => {
    adminCourseServiceMocks
      .createManagedCourse
      .mockResolvedValueOnce(managedCourse);

    const response = await request(app)
      .post('/api/v1/admin/courses')
      .set(
        'Authorization',
        `Bearer ${adminToken}`,
      )
      .send({
        code: 'db201',
        name: 'Database Systems',
        description:
          'Database design and SQL.',
        lecturerId: 'test-lecturer-id',
      });

    expect(response.status).toBe(201);
    expect(response.body.data.course).toEqual(
      managedCourse,
    );

    expect(
      adminCourseServiceMocks
        .createManagedCourse,
    ).toHaveBeenCalledWith(
      {
        code: 'DB201',
        name: 'Database Systems',
        description:
          'Database design and SQL.',
        lecturerId: 'test-lecturer-id',
      },
      'test-admin-id',
      expect.any(String),
    );
  });

  it('rejects an invalid course code', async () => {
    const response = await request(app)
      .post('/api/v1/admin/courses')
      .set(
        'Authorization',
        `Bearer ${adminToken}`,
      )
      .send({
        code: 'DB 201',
        name: 'Database Systems',
        lecturerId: 'test-lecturer-id',
      });

    expect(response.status).toBe(400);

    expect(
      adminCourseServiceMocks
        .createManagedCourse,
    ).not.toHaveBeenCalled();
  });

  it('enrolls a student in a course', async () => {
    adminCourseServiceMocks
      .enrollStudentInCourse
      .mockResolvedValueOnce(
        managedEnrollment,
      );

    const response = await request(app)
      .post(
        '/api/v1/admin/courses/test-course-id/enrollments',
      )
      .set(
        'Authorization',
        `Bearer ${adminToken}`,
      )
      .send({
        studentId: 'test-student-id',
      });

    expect(response.status).toBe(201);
    expect(
      response.body.data.enrollment,
    ).toEqual(managedEnrollment);

    expect(
      adminCourseServiceMocks
        .enrollStudentInCourse,
    ).toHaveBeenCalledWith(
      'test-course-id',
      'test-student-id',
      'test-admin-id',
      expect.any(String),
    );
  });

  it('drops a student enrollment without deleting it', async () => {
    adminCourseServiceMocks
      .dropStudentFromCourse
      .mockResolvedValueOnce({
        ...managedEnrollment,
        status: 'DROPPED',
      });

    const response = await request(app)
      .delete(
        '/api/v1/admin/courses/test-course-id/enrollments/test-student-id',
      )
      .set(
        'Authorization',
        `Bearer ${adminToken}`,
      );

    expect(response.status).toBe(200);
    expect(
      response.body.data.enrollment.status,
    ).toBe('DROPPED');

    expect(
      adminCourseServiceMocks
        .dropStudentFromCourse,
    ).toHaveBeenCalledWith(
      'test-course-id',
      'test-student-id',
      'test-admin-id',
      expect.any(String),
    );
  });
});