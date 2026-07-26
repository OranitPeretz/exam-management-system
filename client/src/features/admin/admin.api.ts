import { httpClient } from '../../api/http-client';
import type {
  CreateManagedUserInput,
  CreateManagedUserResponse,
  ListManagedUsersParams,
  ManagedUser,
  ManagedUsersData,
  ManagedUsersResponse,
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