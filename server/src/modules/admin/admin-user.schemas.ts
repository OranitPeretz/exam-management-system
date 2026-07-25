import { z } from 'zod';

const personNameSchema = z
  .string()
  .trim()
  .min(2)
  .max(50)
  .regex(
    /^[\p{L}\p{M}' -]+$/u,
    'The name contains unsupported characters.',
  );

export const createAdminUserSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email()
      .transform((value) =>
        value.toLowerCase(),
      ),

    firstName: personNameSchema,

    lastName: personNameSchema,

    role: z.enum([
      'STUDENT',
      'LECTURER',
    ]),

    password: z
      .string()
      .min(
        8,
        'Password must contain at least 8 characters.',
      )
      .max(128)
      .regex(
        /[a-z]/,
        'Password must contain a lowercase letter.',
      )
      .regex(
        /[A-Z]/,
        'Password must contain an uppercase letter.',
      )
      .regex(
        /\d/,
        'Password must contain a number.',
      )
      .regex(
        /[^A-Za-z0-9]/,
        'Password must contain a special character.',
      ),
  })
  .strict();

export const listAdminUsersQuerySchema =
  z.object({
    search: z
      .string()
      .trim()
      .max(100)
      .optional(),

    role: z
      .enum([
        'ADMIN',
        'LECTURER',
        'STUDENT',
      ])
      .optional(),

    isActive: z
      .enum([
        'true',
        'false',
      ])
      .transform(
        (value) => value === 'true',
      )
      .optional(),
  });

export type CreateAdminUserInput =
  z.infer<typeof createAdminUserSchema>;

export type ListAdminUsersQuery =
  z.infer<
    typeof listAdminUsersQuerySchema
  >;