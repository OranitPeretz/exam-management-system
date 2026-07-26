export type AdminUserRole =
  | 'ADMIN'
  | 'LECTURER'
  | 'STUDENT';

export type CreatableUserRole =
  | 'LECTURER'
  | 'STUDENT';

export interface ManagedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: AdminUserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    enrollments: number;
    coursesTaught: number;
  };
}

export interface ManagedUsersData {
  users: ManagedUser[];
  total: number;
}

export interface ManagedUsersResponse {
  data: ManagedUsersData;
}

export interface ListManagedUsersParams {
  search?: string;
  role?: AdminUserRole;
  isActive?: boolean;
}

export interface CreateManagedUserInput {
  email: string;
  firstName: string;
  lastName: string;
  role: CreatableUserRole;
  password: string;
}

export interface CreateManagedUserResponse {
  data: {
    user: ManagedUser;
  };
}

export interface ManagedCoursePerson {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
}

export type EnrollmentStatus =
  | 'ACTIVE'
  | 'DROPPED';

export interface ManagedCourseEnrollment {
  id: string;
  status: EnrollmentStatus;
  createdAt: string;
  student: ManagedCoursePerson;
}

export interface ManagedCourse {
  id: string;
  code: string;
  name: string;
  description: string | null;
  lecturerId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lecturer: ManagedCoursePerson;
  enrollments: ManagedCourseEnrollment[];
  _count: {
    enrollments: number;
    exams: number;
  };
}

export interface ManagedCoursesResponse {
  data: {
    courses: ManagedCourse[];
  };
}

export interface CreateManagedCourseInput {
  code: string;
  name: string;
  description?: string;
  lecturerId: string;
}

export interface CreateManagedCourseResponse {
  data: {
    course: ManagedCourse;
  };
}

export interface EnrollStudentInput {
  studentId: string;
}

export interface ManagedEnrollment {
  id: string;
  courseId: string;
  studentId: string;
  status: EnrollmentStatus;
  createdAt: string;
  updatedAt: string;
  course: {
    id: string;
    code: string;
    name: string;
  };
  student: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface EnrollStudentResponse {
  data: {
    enrollment: ManagedEnrollment;
  };
}