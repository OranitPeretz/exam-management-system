export type StudentExamAvailability =
  | 'UPCOMING'
  | 'AVAILABLE'
  | 'ENDED';

export type AttemptStatus =
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'AUTO_SUBMITTED'
  | 'GRADING'
  | 'GRADED';

export interface StudentExamAttemptSummary {
  id: string;
  attemptNumber: number;
  status: AttemptStatus;
  startedAt: string;
  expiresAt: string;
  submittedAt: string | null;
}

export interface StudentExamSummary {
  id: string;
  title: string;
  description: string | null;
  status: 'PUBLISHED';
  startAt: string | null;
  endAt: string | null;
  durationMinutes: number;
  maxAttempts: number;
  passingPercentage: number;
  publishedAt: string | null;
  course: {
    id: string;
    code: string;
    name: string;
  };
  questionCount: number;
  attemptsUsed: number;
  remainingAttempts: number;
  availabilityStatus: StudentExamAvailability;
  canStart: boolean;
  canResume: boolean;
  activeAttemptId: string | null;
  latestAttempt: StudentExamAttemptSummary | null;
}

export interface StudentExamsResponse {
  data: {
    serverTime: string;
    exams: StudentExamSummary[];
  };
}