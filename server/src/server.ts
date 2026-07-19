import cors from 'cors';
import 'dotenv/config';
import express, { type ErrorRequestHandler } from 'express';
import helmet from 'helmet';

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

app.get('/api/v1/health', (_request, response) => {
  response.status(200).json({
    data: {
      status: 'ok',
      service: 'exam-management-api',
      timestamp: new Date().toISOString(),
    },
  });
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

app.listen(port, () => {
  console.log(`API is running at http://localhost:${port}`);
});