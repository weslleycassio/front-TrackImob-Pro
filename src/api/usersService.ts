import { apiClient } from './client';
import type { CreateUserRequest, User } from './types';

export async function getUsersRequest() {
  const { data } = await apiClient.get<User[]>('/usuarios');
  return data;
}

export async function createUserRequest(payload: CreateUserRequest) {
  const { data } = await apiClient.post<User>('/auth/register', payload);
  return data;
}
