-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'LECTURER', 'STUDENT');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'DROPPED');

-- CreateEnum
CREATE TYPE "ExamStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'GRADING', 'RESULTS_PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "QuestionTypeCode" AS ENUM ('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_TEXT', 'LONG_TEXT', 'NUMERIC');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'AUTO_SUBMITTED', 'GRADING', 'GRADED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('EXAM_PUBLISHED', 'EXAM_REMINDER', 'EXAM_SUBMITTED', 'RESULTS_PUBLISHED', 'SYSTEM');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "lecturerId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollments" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_types" (
    "id" TEXT NOT NULL,
    "code" "QuestionTypeCode" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isAutoGradable" BOOLEAN NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "question_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exams" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "instructions" TEXT,
    "status" "ExamStatus" NOT NULL DEFAULT 'DRAFT',
    "startAt" TIMESTAMPTZ(3),
    "endAt" TIMESTAMPTZ(3),
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "maxAttempts" INTEGER NOT NULL DEFAULT 1,
    "passingPercentage" DOUBLE PRECISION NOT NULL DEFAULT 60,
    "shuffleQuestions" BOOLEAN NOT NULL DEFAULT false,
    "showFeedback" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "publishedAt" TIMESTAMPTZ(3),
    "resultsPublishedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 1,
    "position" INTEGER NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "gradingConfig" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_options" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_attempts" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "status" "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "submittedAt" TIMESTAMPTZ(3),
    "lastActivityAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "score" INTEGER,
    "maxScore" INTEGER,
    "percentage" DOUBLE PRECISION,
    "feedback" TEXT,
    "gradedById" TEXT,
    "gradedAt" TIMESTAMPTZ(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "exam_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answers" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "textValue" TEXT,
    "numericValue" DECIMAL(18,4),
    "booleanValue" BOOLEAN,
    "awardedPoints" INTEGER,
    "feedback" TEXT,
    "isAutoGraded" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answer_selections" (
    "id" TEXT NOT NULL,
    "answerId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,

    CONSTRAINT "answer_selections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "readAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_isActive_idx" ON "users"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_expiresAt_idx" ON "refresh_tokens"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "courses_code_key" ON "courses"("code");

-- CreateIndex
CREATE INDEX "courses_lecturerId_idx" ON "courses"("lecturerId");

-- CreateIndex
CREATE INDEX "courses_isActive_idx" ON "courses"("isActive");

-- CreateIndex
CREATE INDEX "enrollments_studentId_idx" ON "enrollments"("studentId");

-- CreateIndex
CREATE INDEX "enrollments_courseId_status_idx" ON "enrollments"("courseId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_courseId_studentId_key" ON "enrollments"("courseId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "question_types_code_key" ON "question_types"("code");

-- CreateIndex
CREATE INDEX "question_types_isActive_idx" ON "question_types"("isActive");

-- CreateIndex
CREATE INDEX "exams_courseId_idx" ON "exams"("courseId");

-- CreateIndex
CREATE INDEX "exams_createdById_idx" ON "exams"("createdById");

-- CreateIndex
CREATE INDEX "exams_status_startAt_endAt_idx" ON "exams"("status", "startAt", "endAt");

-- CreateIndex
CREATE INDEX "questions_typeId_idx" ON "questions"("typeId");

-- CreateIndex
CREATE UNIQUE INDEX "questions_examId_position_key" ON "questions"("examId", "position");

-- CreateIndex
CREATE INDEX "question_options_questionId_idx" ON "question_options"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "question_options_questionId_position_key" ON "question_options"("questionId", "position");

-- CreateIndex
CREATE INDEX "exam_attempts_examId_status_idx" ON "exam_attempts"("examId", "status");

-- CreateIndex
CREATE INDEX "exam_attempts_studentId_status_idx" ON "exam_attempts"("studentId", "status");

-- CreateIndex
CREATE INDEX "exam_attempts_expiresAt_idx" ON "exam_attempts"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "exam_attempts_examId_studentId_attemptNumber_key" ON "exam_attempts"("examId", "studentId", "attemptNumber");

-- CreateIndex
CREATE INDEX "answers_questionId_idx" ON "answers"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "answers_attemptId_questionId_key" ON "answers"("attemptId", "questionId");

-- CreateIndex
CREATE INDEX "answer_selections_optionId_idx" ON "answer_selections"("optionId");

-- CreateIndex
CREATE UNIQUE INDEX "answer_selections_answerId_optionId_key" ON "answer_selections"("answerId", "optionId");

-- CreateIndex
CREATE INDEX "notifications_userId_readAt_idx" ON "notifications"("userId", "readAt");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_idx" ON "audit_logs"("actorId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_lecturerId_fkey" FOREIGN KEY ("lecturerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "question_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_gradedById_fkey" FOREIGN KEY ("gradedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answers" ADD CONSTRAINT "answers_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "exam_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answers" ADD CONSTRAINT "answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer_selections" ADD CONSTRAINT "answer_selections_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "answers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer_selections" ADD CONSTRAINT "answer_selections_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "question_options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
