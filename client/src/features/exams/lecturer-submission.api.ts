import { httpClient } from '../../api/http-client';
import type {
  GradeSubmissionInput,
  GradeSubmissionResponse,
  LecturerExamSubmissionsData,
  LecturerExamSubmissionsResponse,
  LecturerSubmissionDetailsData,
  LecturerSubmissionDetailsResponse,
} from './lecturer-submission.types';

export async function getLecturerExamSubmissions(
  examId: string,
): Promise<LecturerExamSubmissionsData> {
  const response =
    await httpClient.get<LecturerExamSubmissionsResponse>(
      `/lecturer/exams/${examId}/submissions`,
    );

  return response.data.data;
}

export async function getLecturerSubmissionDetails(
  attemptId: string,
): Promise<LecturerSubmissionDetailsData> {
  const response =
    await httpClient.get<LecturerSubmissionDetailsResponse>(
      `/lecturer/attempts/${attemptId}`,
    );

  return response.data.data;
}

export async function gradeLecturerSubmission(
  attemptId: string,
  input: GradeSubmissionInput,
): Promise<LecturerSubmissionDetailsData> {
  const response =
    await httpClient.put<GradeSubmissionResponse>(
      `/lecturer/attempts/${attemptId}/grade`,
      input,
    );

  return response.data.data;
}