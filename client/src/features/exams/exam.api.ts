import { httpClient } from '../../api/http-client';
import type {
  CreateExamInput,
  CreateExamResponse,
  CreateQuestionInput,
  CreateQuestionResponse,
  LecturerCourse,
  LecturerCoursesResponse,
  ManagedExamDetails,
  ManagedExamResponse,
  ManagedExamSummary,
  ManagedExamsResponse,
  ManagedQuestion,
  QuestionType,
  QuestionTypesResponse,
} from './exam.types';

export async function getManagedExams(): Promise<
  ManagedExamSummary[]
> {
  const response = await httpClient.get<ManagedExamsResponse>(
    '/lecturer/exams',
  );

  return response.data.data.exams;
}

export async function getManagedExam(
  examId: string,
): Promise<ManagedExamDetails> {
  const response = await httpClient.get<ManagedExamResponse>(
    `/lecturer/exams/${examId}`,
  );

  return response.data.data.exam;
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

export async function getQuestionTypes(): Promise<
  QuestionType[]
> {
  const response =
    await httpClient.get<QuestionTypesResponse>(
      '/lecturer/question-types',
    );

  return response.data.data.questionTypes;
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

export async function createQuestion(
  examId: string,
  input: CreateQuestionInput,
): Promise<ManagedQuestion> {
  const response =
    await httpClient.post<CreateQuestionResponse>(
      `/lecturer/exams/${examId}/questions`,
      input,
    );

  return response.data.data.question;
}