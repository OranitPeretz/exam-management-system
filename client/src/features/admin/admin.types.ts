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