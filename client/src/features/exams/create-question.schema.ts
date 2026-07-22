import { z } from 'zod';

import type { QuestionTypeCode } from './exam.types';

const choiceQuestionTypes =
  new Set<QuestionTypeCode>([
    'SINGLE_CHOICE',
    'MULTIPLE_CHOICE',
    'TRUE_FALSE',
  ]);

const questionOptionSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, 'Option text is required')
    .max(500, 'Option text cannot exceed 500 characters'),
  isCorrect: z.boolean(),
});

export const createQuestionFormSchema = z
  .object({
    typeCode: z.enum([
      'SINGLE_CHOICE',
      'MULTIPLE_CHOICE',
      'TRUE_FALSE',
      'SHORT_TEXT',
      'LONG_TEXT',
      'NUMERIC',
    ]),
    prompt: z
      .string()
      .trim()
      .min(
        3,
        'Question prompt must contain at least 3 characters',
      )
      .max(
        5000,
        'Question prompt cannot exceed 5000 characters',
      ),
    points: z
      .number()
      .int('Points must be a whole number')
      .min(1, 'Question points must be at least 1')
      .max(100, 'Question points cannot exceed 100'),
    isRequired: z.boolean(),
    options: z
      .array(questionOptionSchema)
      .max(10, 'A question cannot contain more than 10 options'),
    correctNumericAnswer: z
      .number()
      .finite('The numeric answer must be valid')
      .nullable(),
    numericTolerance: z
      .number()
      .min(0, 'Numeric tolerance cannot be negative'),
  })
  .superRefine((data, context) => {
    const isChoiceQuestion =
      choiceQuestionTypes.has(data.typeCode);

    if (isChoiceQuestion && data.options.length < 2) {
      context.addIssue({
        code: 'custom',
        path: ['options'],
        message:
          'Choice questions require at least two options',
      });
    }

    if (!isChoiceQuestion && data.options.length > 0) {
      context.addIssue({
        code: 'custom',
        path: ['options'],
        message:
          'This question type cannot contain options',
      });
    }

    const normalizedOptions = data.options.map(
      (option) => option.text.trim().toLowerCase(),
    );

    if (
      new Set(normalizedOptions).size !==
      normalizedOptions.length
    ) {
      context.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'Question options must be unique',
      });
    }

    const correctOptionsCount = data.options.filter(
      (option) => option.isCorrect,
    ).length;

    if (
      data.typeCode === 'SINGLE_CHOICE' &&
      correctOptionsCount !== 1
    ) {
      context.addIssue({
        code: 'custom',
        path: ['options'],
        message:
          'Single choice questions require exactly one correct option',
      });
    }

    if (
      data.typeCode === 'MULTIPLE_CHOICE' &&
      correctOptionsCount < 1
    ) {
      context.addIssue({
        code: 'custom',
        path: ['options'],
        message:
          'Multiple choice questions require at least one correct option',
      });
    }

    if (data.typeCode === 'TRUE_FALSE') {
      const optionValues = new Set(normalizedOptions);

      if (
        data.options.length !== 2 ||
        !optionValues.has('true') ||
        !optionValues.has('false')
      ) {
        context.addIssue({
          code: 'custom',
          path: ['options'],
          message:
            'True or false questions require True and False options',
        });
      }

      if (correctOptionsCount !== 1) {
        context.addIssue({
          code: 'custom',
          path: ['options'],
          message:
            'True or false questions require one correct option',
        });
      }
    }

    if (
      data.typeCode === 'NUMERIC' &&
      data.correctNumericAnswer === null
    ) {
      context.addIssue({
        code: 'custom',
        path: ['correctNumericAnswer'],
        message: 'A correct numeric answer is required',
      });
    }
  });

export type CreateQuestionFormValues = z.infer<
  typeof createQuestionFormSchema
>;