import type { StudentQuestionTypeCode } from './student-exam.types';

export interface StudentResultSummary {
  attemptId: string;
  attemptNumber: number;
  status: 'GRADED';
  submittedAt: string | null;
  gradedAt: string | null;
  score: number | null;
  maxScore: number | null;
  percentage: number;
  passed: boolean;
  feedback: string | null;
  feedbackAvailable: boolean;
  exam: {
    id: string;
    title: string;
    description: string | null;
    passingPercentage: number;
    resultsPublishedAt: string | null;
    course: {
      id: string;
      code: string;
      name: string;
    };
  };
}

export interface StudentResultsResponse {
  data: {
    results: StudentResultSummary[];
  };
}

export type ResultQuestionTypeCode =
  | 'SINGLE_CHOICE'
  | 'MULTIPLE_CHOICE'
  | 'TRUE_FALSE'
  | 'SHORT_TEXT'
  | 'LONG_TEXT'
  | 'NUMERIC';

export interface StudentResultOption {
  id: string;
  text: string;
  position: number;
  isCorrect?: boolean;
}

export interface StudentResultAnswer {
  id: string;
  textValue: string | null;
  numericValue: number | null;
  booleanValue: boolean | null;
  selectedOptionIds: string[];
  awardedPoints: number | null;
  feedback: string | null;
  isAutoGraded: boolean;
}

export interface StudentResultQuestion {
  id: string;
  prompt: string;
  points: number;
  position: number;
  gradingConfig: unknown;
  type: {
    code: ResultQuestionTypeCode;
    name: string;
    isAutoGradable: boolean;
  };
  options: StudentResultOption[];
  answer: StudentResultAnswer | null;
}

export interface StudentResultDetails {
  result: {
    attemptId: string;
    attemptNumber: number;
    status: 'GRADED';
    startedAt: string;
    submittedAt: string | null;
    gradedAt: string | null;
    score: number | null;
    maxScore: number | null;
    percentage: number;
    passed: boolean;
    feedback: string | null;
    feedbackAvailable: boolean;
  };
  exam: {
    id: string;
    title: string;
    description: string | null;
    instructions: string | null;
    passingPercentage: number;
    resultsPublishedAt: string | null;
    course: {
      id: string;
      code: string;
      name: string;
    };
  };
  questions: StudentResultQuestion[];
}

export interface StudentResultDetailsResponse {
  data: StudentResultDetails;
}

export interface StudentResultAnswer {
  id: string;
  textValue: string | null;
  numericValue: number | null;
  booleanValue: boolean | null;
  selectedOptionIds: string[];
  awardedPoints: number | null;
  feedback: string | null;
  isAutoGraded: boolean;
}

export interface StudentResultQuestion {
  id: string;
  prompt: string;
  points: number;
  position: number;
  gradingConfig: unknown;
  type: {
    code: StudentQuestionTypeCode;
    name: string;
    isAutoGradable: boolean;
  };
  options: Array<{
    id: string;
    text: string;
    position: number;
    isCorrect?: boolean;
  }>;
  answer: StudentResultAnswer | null;
}

export interface StudentResultDetails {
  result: {
    attemptId: string;
    attemptNumber: number;
    status: 'GRADED';
    startedAt: string;
    submittedAt: string | null;
    gradedAt: string | null;
    score: number | null;
    maxScore: number | null;
    percentage: number;
    passed: boolean;
    feedback: string | null;
    feedbackAvailable: boolean;
  };
  exam: {
    id: string;
    title: string;
    description: string | null;
    instructions: string | null;
    passingPercentage: number;
    resultsPublishedAt: string | null;
    course: {
      id: string;
      code: string;
      name: string;
    };
  };
  questions: StudentResultQuestion[];
}

export interface StudentResultDetailsResponse {
  data: StudentResultDetails;
}