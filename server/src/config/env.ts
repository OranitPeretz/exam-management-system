import 'dotenv/config';

import { z } from 'zod';

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(64),
  JWT_ACCESS_EXPIRES_IN: z
    .enum(['15m', '30m', '1h'])
    .default('15m'),
  REFRESH_TOKEN_DAYS: z.coerce.number().int().positive().default(7),
  REFRESH_COOKIE_NAME: z
    .string()
    .min(1)
    .default('examflow_refresh_token'),
});

const result = environmentSchema.safeParse(process.env);

if (!result.success) {
  const messages = result.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join(', ');

  throw new Error(`Invalid environment configuration: ${messages}`);
}

export const env = result.data;