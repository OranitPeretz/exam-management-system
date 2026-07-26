import jwt from 'jsonwebtoken';
import request from 'supertest';
import {
  afterAll,
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

vi.mock(
  '../src/modules/admin/admin-user.service.js',
  () => adminUserServiceMocks,
);

import { app } from '../src/app.js';
import { env } from '../src/config/env.js';
import { prisma } from '../src/database/prisma.js';
import {
  ACCESS_TOKEN_AUDIENCE,
  ACCESS_TOKEN_ISSUER,
} from '../src/modules/auth/auth.constants.js';

type TestRole =
  | 'ADMIN'
  | 'LECTURER'
  | 'STUDENT';

function createAccessToken(
  role: TestRole,
): string {
  return jwt.sign(
    {
      role,
    },
    env.JWT_ACCESS_SECRET,
    {
      subject: `test-${role.toLowerCase()}-id`,
      issuer: ACCESS_TOKEN_ISSUER,
      audience: ACCESS_TOKEN_AUDIENCE,
      expiresIn: '15m',
    },
  );
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Role-based authorization', () => {
  it('blocks a student from admin routes', async () => {
    const token =
      createAccessToken('STUDENT');

    const response = await request(app)
      .get('/api/v1/admin/users')
      .set(
        'Authorization',
        `Bearer ${token}`,
      );

    expect(response.status).toBe(403);

    expect(
      adminUserServiceMocks.listManagedUsers,
    ).not.toHaveBeenCalled();
  });

  it('blocks a lecturer from admin routes', async () => {
    const token =
      createAccessToken('LECTURER');

    const response = await request(app)
      .get('/api/v1/admin/users')
      .set(
        'Authorization',
        `Bearer ${token}`,
      );

    expect(response.status).toBe(403);

    expect(
      adminUserServiceMocks.listManagedUsers,
    ).not.toHaveBeenCalled();
  });

  it('allows an admin to access admin routes', async () => {
    adminUserServiceMocks
      .listManagedUsers
      .mockResolvedValueOnce({
        users: [],
        total: 0,
      });

    const token =
      createAccessToken('ADMIN');

    const response = await request(app)
      .get('/api/v1/admin/users')
      .set(
        'Authorization',
        `Bearer ${token}`,
      );

    expect(response.status).toBe(200);

    expect(response.body.data).toEqual({
      users: [],
      total: 0,
    });

    expect(
      adminUserServiceMocks.listManagedUsers,
    ).toHaveBeenCalledTimes(1);
  });

  it('blocks a student from lecturer routes', async () => {
    const token =
      createAccessToken('STUDENT');

    const response = await request(app)
      .get('/api/v1/lecturer/exams')
      .set(
        'Authorization',
        `Bearer ${token}`,
      );

    expect(response.status).toBe(403);
  });

  it('blocks a lecturer from student routes', async () => {
    const token =
      createAccessToken('LECTURER');

    const response = await request(app)
      .get('/api/v1/student/exams')
      .set(
        'Authorization',
        `Bearer ${token}`,
      );

    expect(response.status).toBe(403);
  });

  it('rejects a token with an invalid issuer', async () => {
    const token = jwt.sign(
      {
        role: 'ADMIN',
      },
      env.JWT_ACCESS_SECRET,
      {
        subject: 'test-admin-id',
        issuer: 'invalid-issuer',
        audience: ACCESS_TOKEN_AUDIENCE,
        expiresIn: '15m',
      },
    );

    const response = await request(app)
      .get('/api/v1/admin/users')
      .set(
        'Authorization',
        `Bearer ${token}`,
      );

    expect(response.status).toBe(401);

    expect(response.body.error).toEqual(
      expect.objectContaining({
        code: 'INVALID_ACCESS_TOKEN',
      }),
    );
  });

  it('rejects a token with an invalid audience', async () => {
    const token = jwt.sign(
      {
        role: 'ADMIN',
      },
      env.JWT_ACCESS_SECRET,
      {
        subject: 'test-admin-id',
        issuer: ACCESS_TOKEN_ISSUER,
        audience: 'invalid-audience',
        expiresIn: '15m',
      },
    );

    const response = await request(app)
      .get('/api/v1/admin/users')
      .set(
        'Authorization',
        `Bearer ${token}`,
      );

    expect(response.status).toBe(401);

    expect(response.body.error).toEqual(
      expect.objectContaining({
        code: 'INVALID_ACCESS_TOKEN',
      }),
    );
  });
});