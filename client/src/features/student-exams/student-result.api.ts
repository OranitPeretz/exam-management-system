import { httpClient } from '../../api/http-client';
import type {
  StudentResultDetails,
  StudentResultDetailsResponse,
  StudentResultsResponse,
  StudentResultSummary,
} from './student-result.types';

export async function getStudentResults(): Promise<
  StudentResultSummary[]
> {
  const response =
    await httpClient.get<StudentResultsResponse>(
      '/student/results',
    );

  return response.data.data.results;
}

export async function getStudentResultDetails(
  attemptId: string,
): Promise<StudentResultDetails> {
  const response =
    await httpClient.get<StudentResultDetailsResponse>(
      `/student/results/${attemptId}`,
    );

  return response.data.data;
}