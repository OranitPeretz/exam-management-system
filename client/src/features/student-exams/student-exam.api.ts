import { httpClient } from '../../api/http-client';
import type {
  SaveAnswerResponse,
  SavedStudentAnswer,
  SaveStudentAnswerInput,
  StartAttemptResponse,
  StudentAttemptData,
  StudentExamSummary,
  StudentExamsResponse,
  StudentSubmissionResult,
  SubmitAttemptResponse,
} from './student-exam.types';

export async function getStudentExams(): Promise<
  StudentExamSummary[]
> {
  const response =
    await httpClient.get<StudentExamsResponse>(
      '/student/exams',
    );

  return response.data.data.exams;
}

export async function startOrResumeAttempt(
  examId: string,
): Promise<StudentAttemptData> {
  const response =
    await httpClient.post<StartAttemptResponse>(
      `/student/exams/${examId}/attempts`,
    );

  return response.data.data;
}

export async function saveStudentAnswer(
  attemptId: string,
  questionId: string,
  input: SaveStudentAnswerInput,
): Promise<SavedStudentAnswer> {
  const response =
    await httpClient.put<SaveAnswerResponse>(
      `/student/attempts/${attemptId}/answers/${questionId}`,
      input,
    );

  return response.data.data;
}

export async function submitStudentAttempt(
  attemptId: string,
): Promise<StudentSubmissionResult> {
  const response =
    await httpClient.post<SubmitAttemptResponse>(
      `/student/attempts/${attemptId}/submit`,
    );

  return response.data.data;
}