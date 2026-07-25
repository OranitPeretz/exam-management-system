import { z } from 'zod';

export const createAdminCourseSchema =
  z
    .object({
      code: z
        .string()
        .trim()
        .min(2)
        .max(20)
        .regex(
          /^[A-Za-z0-9-]+$/,
          'Course code may contain letters, numbers and hyphens.',
        )
        .transform((value) =>
          value.toUpperCase(),
        ),

      name: z
        .string()
        .trim()
        .min(2)
        .max(120),

      description: z
        .string()
        .trim()
        .max(500)
        .optional(),

      lecturerId: z
        .string()
        .trim()
        .min(1),
    })
    .strict();

export const enrollStudentSchema =
  z
    .object({
      studentId: z
        .string()
        .trim()
        .min(1),
    })
    .strict();

export type CreateAdminCourseInput =
  z.infer<
    typeof createAdminCourseSchema
  >;

export type EnrollStudentInput =
  z.infer<typeof enrollStudentSchema>;