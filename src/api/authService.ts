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

  const authPayload = data?.data ?? data?.result ?? data;

  const token =
    authPayload?.token ??
    authPayload?.accessToken ??
    authPayload?.access_token ??
    authPayload?.jwt ??
    data?.token;
  const user =
    authPayload?.user ??
    authPayload?.usuario ??
    authPayload?.admin ??
    authPayload?.profile ??
    data?.user;

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
