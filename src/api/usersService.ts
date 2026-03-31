import { apiClient } from './client';

import type { AlterarSenhaPayload, CreateUserRequest, UpdateMeRequest, UpdateUserRequest, User, UserRole } from './types';

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

const PERFIS_CORRETOR_CAPTADOR = new Set<UserRole>(['ADMIN', 'CORRETOR']);

const extractLoggedUser = (response: UpdateMeResponse) => {
  if ('data' in response) {
    return response.data;
  }

  return response;
};

export async function getUsersRequest() {
  const { data } = await apiClient.get<UsuariosResponse>('/usuarios');
  return data;
}

export async function getBrokerAndAdminUsersRequest() {
  const response = await getUsersRequest();

  return response.data.filter((usuario) => PERFIS_CORRETOR_CAPTADOR.has(usuario.role));
}

export async function getAssignableUsersRequest() {
  return getBrokerAndAdminUsersRequest();
}

export async function getLoggedUserRequest() {
  const { data } = await apiClient.get<UpdateMeResponse>('/usuarios/me');
  return extractLoggedUser(data);
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
  return extractLoggedUser(data);
}


export async function changePasswordRequest(payload: AlterarSenhaPayload) {
  await apiClient.put('/usuarios/me/senha', payload);
}
