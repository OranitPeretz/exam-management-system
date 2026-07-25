import { httpClient } from '../../api/http-client';
import type {
  LecturerExamSubmissionsData,
  LecturerExamSubmissionsResponse,
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