import { httpClient } from '../../api/http-client';
import type {
    CreateManagedCourseInput,
    CreateManagedCourseResponse,
    CreateManagedUserInput,
    CreateManagedUserResponse,
    EnrollStudentInput,
    EnrollStudentResponse,
    ListManagedUsersParams,
    ManagedCourse,
    ManagedCoursesResponse,
    ManagedEnrollment,
    ManagedUser,
    ManagedUsersData,
    ManagedUsersResponse,
    UpdateManagedUserStatusInput,
    UpdateManagedUserStatusResponse,
} from './admin.types';

export async function getManagedUsers(
    params: ListManagedUsersParams = {},
): Promise<ManagedUsersData> {
    const response =
        await httpClient.get<ManagedUsersResponse>(
            '/admin/users',
            {
                params,
            },
        );

    return response.data.data;
}

export async function createManagedUser(
    input: CreateManagedUserInput,
): Promise<ManagedUser> {
    const response =
        await httpClient.post<CreateManagedUserResponse>(
            '/admin/users',
            input,
        );

    return response.data.data.user;
}

export async function getManagedCourses():
    Promise<ManagedCourse[]> {
    const response =
        await httpClient.get<ManagedCoursesResponse>(
            '/admin/courses',
        );

    return response.data.data.courses;
}

export async function createManagedCourse(
    input: CreateManagedCourseInput,
): Promise<ManagedCourse> {
    const response =
        await httpClient.post<CreateManagedCourseResponse>(
            '/admin/courses',
            input,
        );

    return response.data.data.course;
}

export async function enrollStudent(
    courseId: string,
    input: EnrollStudentInput,
): Promise<ManagedEnrollment> {
    const response =
        await httpClient.post<EnrollStudentResponse>(
            `/admin/courses/${courseId}/enrollments`,
            input,
        );

    return response.data.data.enrollment;
}

export async function updateManagedUserStatus(
  userId: string,
  input: UpdateManagedUserStatusInput,
): Promise<ManagedUser> {
  const response =
    await httpClient.patch<UpdateManagedUserStatusResponse>(
      `/admin/users/${userId}/status`,
      input,
    );

  return response.data.data.user;
}