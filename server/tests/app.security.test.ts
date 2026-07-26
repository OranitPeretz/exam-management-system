import request from 'supertest';
import {
  afterAll,
  describe,
  expect,
  it,
} from 'vitest';

import { app } from '../src/app.js';
import { prisma } from '../src/database/prisma.js';

afterAll(async () => {
  await prisma.$disconnect();
});

describe('API security boundaries', () => {
  it('returns 404 for an unknown API route', async () => {
    const response = await request(app)
      .get('/api/v1/route-that-does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty(
      'error',
    );
  });

  it('blocks unauthenticated access to admin routes', async () => {
    const response = await request(app)
      .get('/api/v1/admin/users');

    expect(response.status).toBe(401);

    expect(response.body.error).toEqual(
      expect.objectContaining({
        code: 'ACCESS_TOKEN_REQUIRED',
      }),
    );
  });

  it('blocks unauthenticated access to lecturer routes', async () => {
    const response = await request(app)
      .get('/api/v1/lecturer/exams');

    expect(response.status).toBe(401);

    expect(response.body.error).toEqual(
      expect.objectContaining({
        code: 'ACCESS_TOKEN_REQUIRED',
      }),
    );
  });

  it('blocks unauthenticated access to student routes', async () => {
    const response = await request(app)
      .get('/api/v1/student/exams');

    expect(response.status).toBe(401);

    expect(response.body.error).toEqual(
      expect.objectContaining({
        code: 'ACCESS_TOKEN_REQUIRED',
      }),
    );
  });

  it('rejects an invalid access token', async () => {
    const response = await request(app)
      .get('/api/v1/admin/users')
      .set(
        'Authorization',
        'Bearer invalid-access-token',
      );

    expect(response.status).toBe(401);

    expect(response.body.error).toEqual(
      expect.objectContaining({
        code: 'INVALID_ACCESS_TOKEN',
      }),
    );
  });

  it('does not expose the Express technology header', async () => {
    const response = await request(app)
      .get('/api/v1/admin/users');

    expect(
      response.headers['x-powered-by'],
    ).toBeUndefined();
  });

  it('adds security headers with Helmet', async () => {
    const response = await request(app)
      .get('/api/v1/admin/users');

    expect(
      response.headers[
        'x-content-type-options'
      ],
    ).toBe('nosniff');

    expect(
      response.headers[
        'x-frame-options'
      ],
    ).toBeDefined();
  });
});