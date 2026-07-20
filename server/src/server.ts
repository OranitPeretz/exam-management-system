import cors from 'cors';
import 'dotenv/config';
import express, { type ErrorRequestHandler } from 'express';
import helmet from 'helmet';

import { prisma } from './database/prisma.js';

const app = express();

const port = Number(process.env.PORT ?? 4000);
const clientUrl = process.env.CLIENT_URL ?? 'http://localhost:5173';

app.disable('x-powered-by');

app.use(helmet());

app.use(
  cors({
    origin: clientUrl,
    credentials: true,
  }),
);

app.use(express.json({ limit: '1mb' }));

app.get('/api/v1/health', async (_request, response, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    response.status(200).json({
      data: {
        status: 'ok',
        service: 'exam-management-api',
        database: 'connected',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

app.use((_request, response) => {
  response.status(404).json({
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: 'The requested route was not found.',
    },
  });
});

const errorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next,
) => {
  console.error(error);

  response.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred.',
    },
  });
};

app.use(errorHandler);

const server = app.listen(port, () => {
  console.log(`API is running at http://localhost:${port}`);
});

function shutdown(signal: string): void {
  console.log(`${signal} received. Starting graceful shutdown.`);

  server.close(() => {
    void prisma.$disconnect().then(() => {
      console.log('Database disconnected. Server stopped.');
      process.exit(0);
    });
  });
}

process.on('SIGINT', () => {
  shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  shutdown('SIGTERM');
});