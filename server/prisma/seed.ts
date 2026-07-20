import bcrypt from 'bcryptjs';
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';

import {
  EnrollmentStatus,
  ExamStatus,
  PrismaClient,
  QuestionTypeCode,
  UserRole,
} from '../src/generated/prisma/client.js';

function requireEnvironmentVariable(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

const connectionString = requireEnvironmentVariable('DATABASE_URL');

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

const saltRounds = 12;

async function main(): Promise<void> {
  console.log('Starting database seed...');

  const [
    adminPasswordHash,
    lecturerPasswordHash,
    studentPasswordHash,
  ] = await Promise.all([
    bcrypt.hash(
      requireEnvironmentVariable('SEED_ADMIN_PASSWORD'),
      saltRounds,
    ),
    bcrypt.hash(
      requireEnvironmentVariable('SEED_LECTURER_PASSWORD'),
      saltRounds,
    ),
    bcrypt.hash(
      requireEnvironmentVariable('SEED_STUDENT_PASSWORD'),
      saltRounds,
    ),
  ]);

  const admin = await prisma.user.upsert({
    where: {
      email: 'admin@examflow.local',
    },
    update: {
      firstName: 'Admin',
      lastName: 'User',
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      isActive: true,
    },
    create: {
      email: 'admin@examflow.local',
      firstName: 'Admin',
      lastName: 'User',
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  const lecturer = await prisma.user.upsert({
    where: {
      email: 'lecturer@examflow.local',
    },
    update: {
      firstName: 'Dana',
      lastName: 'Cohen',
      passwordHash: lecturerPasswordHash,
      role: UserRole.LECTURER,
      isActive: true,
    },
    create: {
      email: 'lecturer@examflow.local',
      firstName: 'Dana',
      lastName: 'Cohen',
      passwordHash: lecturerPasswordHash,
      role: UserRole.LECTURER,
      isActive: true,
    },
  });

  const student = await prisma.user.upsert({
    where: {
      email: 'student@examflow.local',
    },
    update: {
      firstName: 'Noa',
      lastName: 'Levi',
      passwordHash: studentPasswordHash,
      role: UserRole.STUDENT,
      isActive: true,
    },
    create: {
      email: 'student@examflow.local',
      firstName: 'Noa',
      lastName: 'Levi',
      passwordHash: studentPasswordHash,
      role: UserRole.STUDENT,
      isActive: true,
    },
  });

  const questionTypes = [
    {
      code: QuestionTypeCode.SINGLE_CHOICE,
      name: 'Single Choice',
      description: 'The student selects one answer from several options.',
      isAutoGradable: true,
    },
    {
      code: QuestionTypeCode.MULTIPLE_CHOICE,
      name: 'Multiple Choice',
      description: 'The student selects one or more answers.',
      isAutoGradable: true,
    },
    {
      code: QuestionTypeCode.TRUE_FALSE,
      name: 'True or False',
      description: 'The student selects either true or false.',
      isAutoGradable: true,
    },
    {
      code: QuestionTypeCode.SHORT_TEXT,
      name: 'Short Text',
      description: 'The student provides a short written answer.',
      isAutoGradable: false,
    },
    {
      code: QuestionTypeCode.LONG_TEXT,
      name: 'Long Text',
      description: 'The student provides a detailed written answer.',
      isAutoGradable: false,
    },
    {
      code: QuestionTypeCode.NUMERIC,
      name: 'Numeric',
      description: 'The student provides a numeric answer.',
      isAutoGradable: true,
    },
  ];

  const questionTypeRecords = await Promise.all(
    questionTypes.map((questionType) =>
      prisma.questionType.upsert({
        where: {
          code: questionType.code,
        },
        update: {
          name: questionType.name,
          description: questionType.description,
          isAutoGradable: questionType.isAutoGradable,
          isActive: true,
        },
        create: {
          ...questionType,
          isActive: true,
        },
      }),
    ),
  );

  const questionTypeIdByCode = new Map(
    questionTypeRecords.map((questionType) => [
      questionType.code,
      questionType.id,
    ]),
  );

  function getQuestionTypeId(code: QuestionTypeCode): string {
    const id = questionTypeIdByCode.get(code);

    if (!id) {
      throw new Error(`Question type ${code} was not created.`);
    }

    return id;
  }

  const course = await prisma.course.upsert({
    where: {
      code: 'WEB101',
    },
    update: {
      name: 'Web Application Development',
      description: 'Introduction to full stack web development.',
      lecturerId: lecturer.id,
      isActive: true,
    },
    create: {
      code: 'WEB101',
      name: 'Web Application Development',
      description: 'Introduction to full stack web development.',
      lecturerId: lecturer.id,
      isActive: true,
    },
  });

  await prisma.enrollment.upsert({
    where: {
      courseId_studentId: {
        courseId: course.id,
        studentId: student.id,
      },
    },
    update: {
      status: EnrollmentStatus.ACTIVE,
    },
    create: {
      courseId: course.id,
      studentId: student.id,
      status: EnrollmentStatus.ACTIVE,
    },
  });

  const examStartAt = new Date(
    Date.now() - 24 * 60 * 60 * 1000,
  );

  const examEndAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  );

  const exam = await prisma.exam.upsert({
    where: {
      id: 'demo-exam-full-stack',
    },
    update: {
      courseId: course.id,
      createdById: lecturer.id,
      title: 'Full Stack Fundamentals',
      description: 'A demo exam covering basic full stack concepts.',
      instructions: 'Answer all questions before submitting the exam.',
      status: ExamStatus.PUBLISHED,
      startAt: examStartAt,
      endAt: examEndAt,
      durationMinutes: 30,
      maxAttempts: 1,
      passingPercentage: 60,
      shuffleQuestions: false,
      showFeedback: true,
      publishedAt: new Date(),
    },
    create: {
      id: 'demo-exam-full-stack',
      courseId: course.id,
      createdById: lecturer.id,
      title: 'Full Stack Fundamentals',
      description: 'A demo exam covering basic full stack concepts.',
      instructions: 'Answer all questions before submitting the exam.',
      status: ExamStatus.PUBLISHED,
      startAt: examStartAt,
      endAt: examEndAt,
      durationMinutes: 30,
      maxAttempts: 1,
      passingPercentage: 60,
      shuffleQuestions: false,
      showFeedback: true,
      publishedAt: new Date(),
    },
  });

  const httpQuestion = await prisma.question.upsert({
    where: {
      id: 'demo-question-http-method',
    },
    update: {
      examId: exam.id,
      typeId: getQuestionTypeId(
        QuestionTypeCode.SINGLE_CHOICE,
      ),
      prompt: 'Which HTTP method is typically used to create a resource?',
      points: 3,
      position: 1,
      isRequired: true,
    },
    create: {
      id: 'demo-question-http-method',
      examId: exam.id,
      typeId: getQuestionTypeId(
        QuestionTypeCode.SINGLE_CHOICE,
      ),
      prompt: 'Which HTTP method is typically used to create a resource?',
      points: 3,
      position: 1,
      isRequired: true,
    },
  });

  const jwtQuestion = await prisma.question.upsert({
    where: {
      id: 'demo-question-jwt',
    },
    update: {
      examId: exam.id,
      typeId: getQuestionTypeId(
        QuestionTypeCode.TRUE_FALSE,
      ),
      prompt: 'JWT can be used to represent authentication claims.',
      points: 3,
      position: 2,
      isRequired: true,
    },
    create: {
      id: 'demo-question-jwt',
      examId: exam.id,
      typeId: getQuestionTypeId(
        QuestionTypeCode.TRUE_FALSE,
      ),
      prompt: 'JWT can be used to represent authentication claims.',
      points: 3,
      position: 2,
      isRequired: true,
    },
  });

  await prisma.question.upsert({
    where: {
      id: 'demo-question-auth-difference',
    },
    update: {
      examId: exam.id,
      typeId: getQuestionTypeId(
        QuestionTypeCode.LONG_TEXT,
      ),
      prompt:
        'Explain the difference between authentication and authorization.',
      points: 4,
      position: 3,
      isRequired: true,
    },
    create: {
      id: 'demo-question-auth-difference',
      examId: exam.id,
      typeId: getQuestionTypeId(
        QuestionTypeCode.LONG_TEXT,
      ),
      prompt:
        'Explain the difference between authentication and authorization.',
      points: 4,
      position: 3,
      isRequired: true,
    },
  });

  const options = [
    {
      id: 'demo-option-http-get',
      questionId: httpQuestion.id,
      text: 'GET',
      isCorrect: false,
      position: 1,
    },
    {
      id: 'demo-option-http-post',
      questionId: httpQuestion.id,
      text: 'POST',
      isCorrect: true,
      position: 2,
    },
    {
      id: 'demo-option-http-put',
      questionId: httpQuestion.id,
      text: 'PUT',
      isCorrect: false,
      position: 3,
    },
    {
      id: 'demo-option-http-delete',
      questionId: httpQuestion.id,
      text: 'DELETE',
      isCorrect: false,
      position: 4,
    },
    {
      id: 'demo-option-jwt-true',
      questionId: jwtQuestion.id,
      text: 'True',
      isCorrect: true,
      position: 1,
    },
    {
      id: 'demo-option-jwt-false',
      questionId: jwtQuestion.id,
      text: 'False',
      isCorrect: false,
      position: 2,
    },
  ];

  await Promise.all(
    options.map((option) =>
      prisma.questionOption.upsert({
        where: {
          id: option.id,
        },
        update: {
          questionId: option.questionId,
          text: option.text,
          isCorrect: option.isCorrect,
          position: option.position,
        },
        create: option,
      }),
    ),
  );

  console.log('Database seed completed successfully.');
  console.log(`Admin created: ${admin.email}`);
  console.log(`Lecturer created: ${lecturer.email}`);
  console.log(`Student created: ${student.email}`);
  console.log(`Course created: ${course.code}`);
  console.log(`Exam created: ${exam.title}`);
}

main()
  .catch((error: unknown) => {
    console.error('Database seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });