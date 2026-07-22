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

export type StudentQuestionTypeCode =
  | 'SINGLE_CHOICE'
  | 'MULTIPLE_CHOICE'
  | 'TRUE_FALSE'
  | 'SHORT_TEXT'
  | 'LONG_TEXT'
  | 'NUMERIC';

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

export interface StudentAttemptAnswer {
  questionId: string;
  textValue: string | null;
  numericValue: number | null;
  booleanValue: boolean | null;
  selectedOptionIds: string[];
  version: number;
}

export interface StudentAttemptQuestion {
  id: string;
  prompt: string;
  points: number;
  position: number;
  isRequired: boolean;
  type: {
    code: StudentQuestionTypeCode;
    name: string;
  };
  options: Array<{
    id: string;
    text: string;
    position: number;
  }>;
}

export interface StudentAttemptData {
  serverTime: string;
  resumed: boolean;
  remainingSeconds: number;
  attempt: {
    id: string;
    attemptNumber: number;
    status: AttemptStatus;
    startedAt: string;
    expiresAt: string;
    submittedAt: string | null;
    lastActivityAt: string;
    version: number;
    answers: StudentAttemptAnswer[];
  };
  exam: {
    id: string;
    title: string;
    description: string | null;
    instructions: string | null;
    startAt: string;
    endAt: string;
    durationMinutes: number;
    maxAttempts: number;
    passingPercentage: number;
    shuffleQuestions: boolean;
    showFeedback: boolean;
    course: {
      id: string;
      code: string;
      name: string;
    };
    totalPoints: number;
    questions: StudentAttemptQuestion[];
  };
}

export interface SaveStudentAnswerInput {
  selectedOptionIds?: string[];
  textValue?: string | null;
  numericValue?: number | null;
  version?: number;
}

export interface SavedStudentAnswer {
  savedAt: string;
  attemptVersion: number;
  lastActivityAt: string;
  answer: StudentAttemptAnswer;
}

export interface StudentSubmissionResult {
  attempt: {
    id: string;
    attemptNumber: number;
    status: AttemptStatus;
    submittedAt: string;
  };
  answeredQuestions: number;
  totalQuestions: number;
  requiresManualGrading: boolean;
  wasAutomaticallySubmitted: boolean;
  message: string;
}

export interface StudentExamsResponse {
  data: {
    serverTime: string;
    exams: StudentExamSummary[];
  };
}

export interface StartAttemptResponse {
  data: StudentAttemptData;
}

export interface SaveAnswerResponse {
  data: SavedStudentAnswer;
}

export interface SubmitAttemptResponse {
  data: StudentSubmissionResult;
}