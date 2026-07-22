export type ExamStatus =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'CLOSED'
  | 'GRADING'
  | 'RESULTS_PUBLISHED'
  | 'ARCHIVED';

export interface ManagedExamSummary {
  id: string;
  courseId: string;
  createdById: string;
  title: string;
  description: string | null;
  instructions: string | null;
  status: ExamStatus;
  startAt: string | null;
  endAt: string | null;
  durationMinutes: number;
  maxAttempts: number;
  passingPercentage: number;
  shuffleQuestions: boolean;
  showFeedback: boolean;
  version: number;
  publishedAt: string | null;
  resultsPublishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  course: {
    id: string;
    code: string;
    name: string;
    lecturerId: string;
  };
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  _count: {
    questions: number;
    attempts: number;
  };
}

export interface LecturerCourse {
  id: string;
  code: string;
  name: string;
  description: string | null;
  lecturerId: string;
  createdAt: string;
  updatedAt: string;
  lecturer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  _count: {
    enrollments: number;
    exams: number;
  };
}

export interface CreateExamInput {
  courseId: string;
  title: string;
  description?: string;
  instructions?: string;
  startAt?: string;
  endAt?: string;
  durationMinutes: number;
  maxAttempts: number;
  passingPercentage: number;
  shuffleQuestions: boolean;
  showFeedback: boolean;
}

export interface ManagedExamsResponse {
  data: {
    exams: ManagedExamSummary[];
  };
}

export interface LecturerCoursesResponse {
  data: {
    courses: LecturerCourse[];
  };
}

export interface CreateExamResponse {
  data: {
    exam: ManagedExamSummary;
  };
}