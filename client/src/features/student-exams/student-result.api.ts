import { httpClient } from '../../api/http-client';
import type {
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