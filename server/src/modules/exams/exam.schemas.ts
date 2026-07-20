import { z } from 'zod';

const optionalDateTimeSchema = z
  .string()
  .datetime({ offset: true })
  .nullable();

const editableExamFieldsSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, 'Exam title must contain at least 3 characters')
      .max(150, 'Exam title cannot exceed 150 characters'),
    description: z
      .string()
      .trim()
      .max(2000, 'Description cannot exceed 2000 characters')
      .nullable()
      .optional(),
    instructions: z
      .string()
      .trim()
      .max(5000, 'Instructions cannot exceed 5000 characters')
      .nullable()
      .optional(),
    startAt: optionalDateTimeSchema.optional(),
    endAt: optionalDateTimeSchema.optional(),
    durationMinutes: z
      .number()
      .int()
      .min(1, 'Duration must be at least 1 minute')
      .max(480, 'Duration cannot exceed 480 minutes')
      .optional(),
    maxAttempts: z
      .number()
      .int()
      .min(1, 'At least one attempt must be allowed')
      .max(10, 'Maximum attempts cannot exceed 10')
      .optional(),
    passingPercentage: z
      .number()
      .min(0, 'Passing percentage cannot be negative')
      .max(100, 'Passing percentage cannot exceed 100')
      .optional(),
    shuffleQuestions: z.boolean().optional(),
    showFeedback: z.boolean().optional(),
  })
  .strict();

export const createExamSchema = editableExamFieldsSchema
  .extend({
    courseId: z
      .string()
      .trim()
      .min(1, 'Course ID is required'),
  })
  .superRefine((data, context) => {
    if (
      data.startAt &&
      data.endAt &&
      new Date(data.endAt).getTime() <=
        new Date(data.startAt).getTime()
    ) {
      context.addIssue({
        code: 'custom',
        path: ['endAt'],
        message: 'End time must be later than start time',
      });
    }
  });

export const updateExamSchema = editableExamFieldsSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  })
  .superRefine((data, context) => {
    if (
      data.startAt &&
      data.endAt &&
      new Date(data.endAt).getTime() <=
        new Date(data.startAt).getTime()
    ) {
      context.addIssue({
        code: 'custom',
        path: ['endAt'],
        message: 'End time must be later than start time',
      });
    }
  });

export type CreateExamInput = z.infer<typeof createExamSchema>;
export type UpdateExamInput = z.infer<typeof updateExamSchema>;