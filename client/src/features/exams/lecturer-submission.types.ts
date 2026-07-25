import type { ExamStatus } from './exam.types';

export type SubmissionStatus =
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'GRADING'
  | 'GRADED'
  | 'EXPIRED';

export interface SubmissionStudent {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface LecturerExamSubmission {
  id: string;
  attemptNumber: number;
  status: SubmissionStatus;
  startedAt: string;
  expiresAt: string;
  submittedAt: string | null;
  score: number | null;
  maxScore: number;
  percentage: number | null;
  feedback: string | null;
  gradedAt: string | null;
  version: number;
  answeredQuestions: number;
  student: SubmissionStudent;
}

export interface LecturerSubmissionExam {
  id: string;
  title: string;
  status: ExamStatus;
  totalPoints: number;
  course: {
    id: string;
    code: string;
    name: string;
  };
}

export interface LecturerSubmissionSummary {
  totalSubmissions: number;
  waitingForGrading: number;
  graded: number;
}

export interface LecturerExamSubmissionsData {
  exam: LecturerSubmissionExam;
  summary: LecturerSubmissionSummary;
  submissions: LecturerExamSubmission[];
}

export interface LecturerExamSubmissionsResponse {
  data: LecturerExamSubmissionsData;
}