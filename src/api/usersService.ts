import { apiClient } from './client';
import type { CreateUserRequest, UpdateUserRequest, User } from './types';

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
