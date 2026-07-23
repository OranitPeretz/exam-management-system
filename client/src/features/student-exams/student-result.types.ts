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