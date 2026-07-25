import type {
  ExamStatus,
  QuestionTypeCode,
} from './exam.types';

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

export interface LecturerSubmissionDetails {
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
}

export interface LecturerSubmissionQuestionOption {
  id: string;
  text: string;
  position: number;
  isCorrect: boolean;
}

export interface LecturerSubmissionAnswer {
  id: string;
  textValue: string | null;
  numericValue: number | null;
  booleanValue: boolean | null;
  selectedOptionIds: string[];
  awardedPoints: number | null;
  feedback: string | null;
  isAutoGraded: boolean;
  version: number;
}

export interface LecturerSubmissionQuestion {
  id: string;
  position: number;
  prompt: string;
  points: number;
  isRequired: boolean;
  requiresManualGrading: boolean;
  type: {
    id: string;
    code: QuestionTypeCode;
    name: string;
    isAutoGradable: boolean;
  };
  options: LecturerSubmissionQuestionOption[];
  answer: LecturerSubmissionAnswer | null;
}

export interface LecturerSubmissionDetailsData {
  submission: LecturerSubmissionDetails;
  student: SubmissionStudent;
  questions: LecturerSubmissionQuestion[];
}

export interface LecturerSubmissionDetailsResponse {
  data: LecturerSubmissionDetailsData;
}

export interface GradeAnswerInput {
  questionId: string;
  awardedPoints: number;
  feedback?: string;
}

export interface GradeSubmissionInput {
  version: number;
  feedback?: string;
  answers: GradeAnswerInput[];
}

export interface GradeSubmissionResponse {
  data: LecturerSubmissionDetailsData;
}