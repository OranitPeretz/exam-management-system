import { httpClient } from '../../api/http-client';
import type {
  StudentExamSummary,
  StudentExamsResponse,
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