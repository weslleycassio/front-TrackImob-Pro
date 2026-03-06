import { apiClient } from './client';
import type { CreateUserRequest, User, UserRole } from './types';

export type Usuario = {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  role: UserRole;
  ativo: boolean;
};

export type UsuariosResponse = {
  data: Usuario[];
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
