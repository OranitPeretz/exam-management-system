import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { env } from './config/env.js';
import { prisma } from './database/prisma.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFoundHandler } from './middleware/not-found.js';
import { adminRouter } from './modules/admin/admin.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { lecturerExamRouter } from './modules/exams/exam.routes.js';
import { studentExamRouter } from './modules/student-exams/student-exam.routes.js';

export const app = express();

if (env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.disable('x-powered-by');

app.use(helmet());

app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  }),
);

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.get(
  '/api/v1/health',
  async (_request, response, next) => {
    try {
      await prisma.$queryRaw`SELECT 1`;

      response.status(200).json({
        data: {
          status: 'ok',
          service: 'exam-management-api',
          database: 'connected',
          timestamp:
            new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/admin', adminRouter);
app.use(
  '/api/v1/lecturer',
  lecturerExamRouter,
);
app.use(
  '/api/v1/student',
  studentExamRouter,
);

app.use(notFoundHandler);
app.use(errorHandler);