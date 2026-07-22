import { httpClient } from '../../api/http-client';
import type {
  CreateExamInput,
  CreateExamResponse,
  LecturerCourse,
  LecturerCoursesResponse,
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

export async function getLecturerCourses(): Promise<
  LecturerCourse[]
> {
  const response =
    await httpClient.get<LecturerCoursesResponse>(
      '/lecturer/courses',
    );

  return response.data.data.courses;
}

export async function createExam(
  input: CreateExamInput,
): Promise<ManagedExamSummary> {
  const response = await httpClient.post<CreateExamResponse>(
    '/lecturer/exams',
    input,
  );

  return response.data.data.exam;
}