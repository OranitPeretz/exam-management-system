import { z } from 'zod';

const answerGradeSchema = z
  .object({
    questionId: z.string().trim().min(1),
    awardedPoints: z.number().int().min(0),
    feedback: z
      .string()
      .trim()
      .max(1000)
      .nullable()
      .optional(),
  })
  .strict();

export const gradeSubmissionSchema = z
  .object({
    version: z.number().int().positive(),
    feedback: z
      .string()
      .trim()
      .max(2000)
      .nullable()
      .optional(),
    answers: z.array(answerGradeSchema).min(1),
  })
  .strict()
  .superRefine((data, context) => {
    const questionIds = new Set<string>();

    data.answers.forEach((answer, index) => {
      if (questionIds.has(answer.questionId)) {
        context.addIssue({
          code: 'custom',
          path: [
            'answers',
            index,
            'questionId',
          ],
          message:
            'Each question can only be graded once.',
        });
      }

      questionIds.add(answer.questionId);
    });
  });

export type GradeSubmissionInput = z.infer<
  typeof gradeSubmissionSchema
>;