import { httpClient } from '../../api/http-client';
import type {
  AuthSessionResponse,
  LoginCredentials,
} from './auth.types';

let pendingRefreshRequest: Promise<AuthSessionResponse> | null =
  null;

export async function loginRequest(
  credentials: LoginCredentials,
): Promise<AuthSessionResponse> {
  const response = await httpClient.post<AuthSessionResponse>(
    '/auth/login',
    credentials,
  );

  return response.data;
}

export function refreshSessionRequest(): Promise<AuthSessionResponse> {
  if (!pendingRefreshRequest) {
    pendingRefreshRequest = httpClient
      .post<AuthSessionResponse>('/auth/refresh')
      .then((response) => response.data)
      .finally(() => {
        pendingRefreshRequest = null;
      });
  }

  return pendingRefreshRequest;
}

export async function logoutRequest(): Promise<void> {
  await httpClient.post('/auth/logout');
}