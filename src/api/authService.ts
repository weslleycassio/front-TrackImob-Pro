import { apiClient } from './client';
import { authEndpoints } from './endpoints/auth';
import type { AuthResponse, LoginRequest, RegisterRequest } from './types';

export async function loginRequest(payload: LoginRequest) {
  const { data } = await apiClient.post<AuthResponse>(authEndpoints.login, payload);
  return data;
}

export async function registerRequest(payload: RegisterRequest) {
  const { data } = await apiClient.post<AuthResponse>(authEndpoints.register, payload);
  return data;
}
