import { apiClient } from './client';
import { authEndpoints } from './endpoints/auth';
import type {
  LoginRequest,
  LoginResponse,
  RegisterImobiliariaRequest,
  RegisterImobiliariaResponse,
} from './types';

export async function loginRequest(payload: LoginRequest) {
  const { data } = await apiClient.post(authEndpoints.login, payload);

  const token = data?.token ?? data?.accessToken ?? data?.access_token;
  const user = data?.user ?? data?.usuario;

  if (!token || !user) {
    throw new Error('Resposta de login inválida.');
  }

  return {
    token,
    user,
  } satisfies LoginResponse;
}

export async function registerImobiliariaRequest(payload: RegisterImobiliariaRequest) {
  try {
    const { data } = await apiClient.post<RegisterImobiliariaResponse>(
      authEndpoints.registerImobiliaria,
      payload,
    );
    return data;
  } catch {
    const { data } = await apiClient.post<RegisterImobiliariaResponse>(
      '/auth/register-imobiliaria',
      payload,
    );
    return data;
  }
}
