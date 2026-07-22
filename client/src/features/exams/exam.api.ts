import { httpClient } from '../../api/http-client';
import type {
  ManagedExamSummary,
  ManagedExamsResponse,
} from './exam.types';

export async function getManagedExams(): Promise<
  ManagedExamSummary[]
> {
  const response = await httpClient.get<ManagedExamsResponse>(
    '/lecturer/exams',
  );

  return response.data.data.exams;
}