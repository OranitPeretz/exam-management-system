import { z } from 'zod';

export const saveStudentAnswerSchema = z
  .object({
    selectedOptionIds: z
      .array(z.string().trim().min(1))
      .max(10)
      .optional(),
    textValue: z
      .string()
      .max(
        20_000,
        'The answer cannot exceed 20000 characters',
      )
      .nullable()
      .optional(),
    numericValue: z
      .number()
      .finite('The numeric answer must be valid')
      .nullable()
      .optional(),
    version: z
      .number()
      .int()
      .min(1)
      .optional(),
  })
  .strict()
  .superRefine((data, context) => {
    const suppliedAnswerFields = [
      data.selectedOptionIds !== undefined,
      data.textValue !== undefined,
      data.numericValue !== undefined,
    ].filter(Boolean).length;

    if (suppliedAnswerFields !== 1) {
      context.addIssue({
        code: 'custom',
        message:
          'Exactly one answer value must be supplied',
      });
    }

    if (
      data.selectedOptionIds &&
      new Set(data.selectedOptionIds).size !==
        data.selectedOptionIds.length
    ) {
      context.addIssue({
        code: 'custom',
        path: ['selectedOptionIds'],
        message:
          'Selected option IDs must be unique',
      });
    }
  });

export type SaveStudentAnswerInput = z.infer<
  typeof saveStudentAnswerSchema
>;