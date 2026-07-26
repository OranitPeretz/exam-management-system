import request from 'supertest';
import {
  afterAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

const authServiceMocks = vi.hoisted(
  () => ({
    login: vi.fn(),
    refreshSession: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
  }),
);

vi.mock(
  '../src/modules/auth/auth.service.js',
  () => authServiceMocks,
);

import { app } from '../src/app.js';
import { env } from '../src/config/env.js';
import { prisma } from '../src/database/prisma.js';
import { AppError } from '../src/errors/app-error.js';

const authenticationResult = {
  user: {
    id: 'test-student-id',
    email: 'student@example.com',
    firstName: 'Test',
    lastName: 'Student',
    role: 'STUDENT' as const,
  },
  accessToken: 'test-access-token',
  refreshToken: 'test-refresh-token',
  refreshTokenExpiresAt:
    new Date('2030-01-01T00:00:00.000Z'),
};

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Authentication API', () => {
  it('rejects an invalid login request body', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'not-an-email',
        password: 'short',
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty(
      'error',
    );

    expect(
      authServiceMocks.login,
    ).not.toHaveBeenCalled();
  });

  it('normalizes the email and returns a successful login response', async () => {
    authServiceMocks.login.mockResolvedValueOnce(
      authenticationResult,
    );

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: '  STUDENT@EXAMPLE.COM  ',
        password: 'Student123!',
      });

    expect(response.status).toBe(200);

    expect(
      authServiceMocks.login,
    ).toHaveBeenCalledWith(
      'student@example.com',
      'Student123!',
      expect.any(String),
    );

    expect(response.body.data).toEqual(
      expect.objectContaining({
        user: authenticationResult.user,
        accessToken:
          authenticationResult.accessToken,
        accessTokenExpiresIn:
          env.JWT_ACCESS_EXPIRES_IN,
      }),
    );

    const cookies =
      response.headers['set-cookie'];

    expect(cookies).toBeDefined();
    expect(cookies?.[0]).toContain(
      `${env.REFRESH_COOKIE_NAME}=${authenticationResult.refreshToken}`,
    );
    expect(cookies?.[0]).toContain(
      'HttpOnly',
    );
    expect(cookies?.[0]).toContain(
      'Path=/api/v1/auth',
    );
  });

  it('returns 401 when the credentials are invalid', async () => {
    authServiceMocks.login.mockRejectedValueOnce(
      new AppError(
        401,
        'INVALID_CREDENTIALS',
        'The email or password is incorrect.',
      ),
    );

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'student@example.com',
        password: 'WrongPassword123!',
      });

    expect(response.status).toBe(401);

    expect(response.body.error).toEqual(
      expect.objectContaining({
        code: 'INVALID_CREDENTIALS',
      }),
    );
  });

  it('requires a refresh-token cookie', async () => {
    const response = await request(app)
      .post('/api/v1/auth/refresh');

    expect(response.status).toBe(401);

    expect(response.body.error).toEqual(
      expect.objectContaining({
        code: 'REFRESH_TOKEN_REQUIRED',
      }),
    );

    expect(
      authServiceMocks.refreshSession,
    ).not.toHaveBeenCalled();
  });

  it('rotates a valid refresh token', async () => {
    authServiceMocks.refreshSession
      .mockResolvedValueOnce({
        ...authenticationResult,
        refreshToken:
          'rotated-refresh-token',
      });

    const response = await request(app)
      .post('/api/v1/auth/refresh')
      .set(
        'Cookie',
        `${env.REFRESH_COOKIE_NAME}=old-refresh-token`,
      );

    expect(response.status).toBe(200);

    expect(
      authServiceMocks.refreshSession,
    ).toHaveBeenCalledWith(
      'old-refresh-token',
    );

    expect(response.body.data.accessToken).toBe(
      authenticationResult.accessToken,
    );

    const cookies =
      response.headers['set-cookie'];

    expect(cookies?.[0]).toContain(
      `${env.REFRESH_COOKIE_NAME}=rotated-refresh-token`,
    );
    expect(cookies?.[0]).toContain(
      'HttpOnly',
    );
  });

  it('clears the refresh cookie during logout', async () => {
    authServiceMocks.logout
      .mockResolvedValueOnce(undefined);

    const response = await request(app)
      .post('/api/v1/auth/logout')
      .set(
        'Cookie',
        `${env.REFRESH_COOKIE_NAME}=refresh-token-to-revoke`,
      );

    expect(response.status).toBe(204);

    expect(
      authServiceMocks.logout,
    ).toHaveBeenCalledWith(
      'refresh-token-to-revoke',
    );

    const cookies =
      response.headers['set-cookie'];

    expect(cookies).toBeDefined();
    expect(cookies?.[0]).toContain(
      `${env.REFRESH_COOKIE_NAME}=`,
    );
    expect(cookies?.[0]).toContain(
      'Path=/api/v1/auth',
    );
  });
});