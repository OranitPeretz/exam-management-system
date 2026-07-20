import { z } from 'zod';

import { QuestionTypeCode } from '../../generated/prisma/client.js';

const choiceQuestionTypes = new Set<QuestionTypeCode>([
  QuestionTypeCode.SINGLE_CHOICE,
  QuestionTypeCode.MULTIPLE_CHOICE,
  QuestionTypeCode.TRUE_FALSE,
]);

const questionOptionSchema = z
  .object({
    text: z
      .string()
      .trim()
      .min(1, 'Option text is required')
      .max(500, 'Option text cannot exceed 500 characters'),
    isCorrect: z.boolean(),
  })
  .strict();

export const createQuestionSchema = z
  .object({
    typeCode: z.nativeEnum(QuestionTypeCode),
    prompt: z
      .string()
      .trim()
      .min(3, 'Question prompt must contain at least 3 characters')
      .max(5000, 'Question prompt cannot exceed 5000 characters'),
    points: z
      .number()
      .int()
      .min(1, 'Question points must be at least 1')
      .max(100, 'Question points cannot exceed 100'),
    isRequired: z.boolean().optional(),
    options: z
      .array(questionOptionSchema)
      .max(10, 'A question cannot contain more than 10 options')
      .optional(),
    correctNumericAnswer: z.number().optional(),
    numericTolerance: z
      .number()
      .min(0, 'Numeric tolerance cannot be negative')
      .optional(),
  })
  .strict()
  .superRefine((data, context) => {
    const options = data.options ?? [];

    const isChoiceQuestion = choiceQuestionTypes.has(
      data.typeCode,
    );

    if (isChoiceQuestion && options.length < 2) {
      context.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'Choice questions require at least two options',
      });
    }

    if (!isChoiceQuestion && options.length > 0) {
      context.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'This question type cannot contain options',
      });
    }

    const normalizedOptionTexts = options.map((option) =>
      option.text.toLowerCase(),
    );

    if (
      new Set(normalizedOptionTexts).size !==
      normalizedOptionTexts.length
    ) {
      context.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'Question options must be unique',
      });
    }

    const correctOptionsCount = options.filter(
      (option) => option.isCorrect,
    ).length;

    if (
      data.typeCode === QuestionTypeCode.SINGLE_CHOICE &&
      correctOptionsCount !== 1
    ) {
      context.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'Single choice questions require exactly one correct option',
      });
    }

    if (
      data.typeCode === QuestionTypeCode.MULTIPLE_CHOICE &&
      correctOptionsCount < 1
    ) {
      context.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'Multiple choice questions require a correct option',
      });
    }

    if (data.typeCode === QuestionTypeCode.TRUE_FALSE) {
      const trueFalseValues = new Set(normalizedOptionTexts);

      if (
        options.length !== 2 ||
        !trueFalseValues.has('true') ||
        !trueFalseValues.has('false')
      ) {
        context.addIssue({
          code: 'custom',
          path: ['options'],
          message: 'True or false questions require True and False options',
        });
      }

      if (correctOptionsCount !== 1) {
        context.addIssue({
          code: 'custom',
          path: ['options'],
          message: 'True or false questions require one correct option',
        });
      }
    }

    if (
      data.typeCode === QuestionTypeCode.NUMERIC &&
      data.correctNumericAnswer === undefined
    ) {
      context.addIssue({
        code: 'custom',
        path: ['correctNumericAnswer'],
        message: 'A correct numeric answer is required',
      });
    }

    if (
      data.typeCode !== QuestionTypeCode.NUMERIC &&
      (
        data.correctNumericAnswer !== undefined ||
        data.numericTolerance !== undefined
      )
    ) {
      context.addIssue({
        code: 'custom',
        path: ['correctNumericAnswer'],
        message: 'Numeric grading fields are allowed only for numeric questions',
      });
    }
  });

export const updateQuestionSchema = createQuestionSchema;

export type CreateQuestionInput = z.infer<
  typeof createQuestionSchema
>;

export type UpdateQuestionInput = z.infer<
  typeof updateQuestionSchema
>;