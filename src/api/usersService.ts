import { apiClient } from './client';

import type { CreateUserRequest, UpdateMeRequest, UpdateUserRequest, User } from './types';

type UpdateMeResponse =
  | User
  | {
      message?: string;
      data: User;
    };

export type UsuariosResponse = {
  data: User[];
  total: number;
};

export async function getUsersRequest() {
  const { data } = await apiClient.get<UsuariosResponse>('/usuarios');
  return data;
}

export async function createUserRequest(payload: CreateUserRequest) {
  const { data } = await apiClient.post<User>('/auth/register', payload);
  return data;
}

export async function updateUserRequest(id: string, payload: UpdateUserRequest) {
  const { data } = await apiClient.put<User>(`/usuarios/${id}`, payload);
  return data;
}

export async function updateLoggedUserRequest(payload: UpdateMeRequest) {
  const { data } = await apiClient.put<UpdateMeResponse>('/usuarios/me', payload);

  if ('data' in data) {
    return data.data;
  }

  return data;
}

export async function getLoggedUserRequest() {
  const { data } = await apiClient.get<User>('/usuarios/me');
  return data;
}
