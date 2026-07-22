import { z } from 'zod';

export const createExamFormSchema = z
  .object({
    courseId: z
      .string()
      .min(1, 'Please select a course'),
    title: z
      .string()
      .trim()
      .min(3, 'Title must contain at least 3 characters')
      .max(150, 'Title cannot exceed 150 characters'),
    description: z
      .string()
      .trim()
      .max(2000, 'Description cannot exceed 2000 characters'),
    instructions: z
      .string()
      .trim()
      .max(5000, 'Instructions cannot exceed 5000 characters'),
    startAt: z.string(),
    endAt: z.string(),
    durationMinutes: z
      .number()
      .int()
      .min(1, 'Duration must be at least 1 minute')
      .max(480, 'Duration cannot exceed 480 minutes'),
    maxAttempts: z
      .number()
      .int()
      .min(1, 'At least one attempt must be allowed')
      .max(10, 'Maximum attempts cannot exceed 10'),
    passingPercentage: z
      .number()
      .min(0, 'Passing percentage cannot be negative')
      .max(100, 'Passing percentage cannot exceed 100'),
    shuffleQuestions: z.boolean(),
    showFeedback: z.boolean(),
  })
  .superRefine((data, context) => {
    const hasStart = data.startAt.length > 0;
    const hasEnd = data.endAt.length > 0;

    if (hasStart !== hasEnd) {
      context.addIssue({
        code: 'custom',
        path: hasStart ? ['endAt'] : ['startAt'],
        message: 'Start and end times must be provided together',
      });

      return;
    }

    if (
      hasStart &&
      hasEnd &&
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

export type CreateExamFormValues = z.infer<
  typeof createExamFormSchema
>;