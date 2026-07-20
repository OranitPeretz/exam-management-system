export type UserRole = 'ADMIN' | 'LECTURER' | 'STUDENT';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthSessionResponse {
  data: {
    user: AuthUser;
    accessToken: string;
    accessTokenExpiresIn: string;
  };
}