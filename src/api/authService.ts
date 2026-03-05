import { apiClient } from './client';
import { authEndpoints } from './endpoints/auth';
import type {
  LoginRequest,
  LoginResponse,
  RegisterImobiliariaRequest,
  RegisterImobiliariaResponse,
  User,
} from './types';

type JwtPayload = Record<string, unknown>;

function decodeJwtPayload(token: string): JwtPayload | null {
  const [, payload] = token.split('.');
  if (!payload) return null;

  try {
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = normalizedPayload.padEnd(normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4), '=');
    const decodedPayload = atob(paddedPayload);
    return JSON.parse(decodedPayload) as JwtPayload;
  } catch {
    return null;
  }
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsedValue = Number(value);
    if (Number.isFinite(parsedValue)) {
      return parsedValue;
    }
  }

  return null;
}

function getUserFromToken(token: string, email: string): User | null {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  const userId =
    toNumber(payload.id) ??
    toNumber(payload.userId) ??
    toNumber(payload.usuarioId) ??
    toNumber(payload.sub);
  const imobiliariaId =
    toNumber(payload.imobiliariaId) ??
    toNumber(payload.realEstateId) ??
    toNumber(payload.companyId);

  if (!userId || !imobiliariaId) {
    return null;
  }

  const rawRole =
    payload.role ??
    payload.roles ??
    payload.perfil ??
    payload.userRole;
  const role = String(Array.isArray(rawRole) ? rawRole[0] : rawRole ?? '').toUpperCase() === 'ADMIN'
    ? 'ADMIN'
    : 'CORRETOR';

  return {
    id: userId,
    nome: String(payload.nome ?? payload.name ?? payload.username ?? 'Usuário'),
    telefone: String(payload.telefone ?? payload.phone ?? ''),
    email: String(payload.email ?? payload.userEmail ?? email),
    role,
    imobiliariaId,
    imobiliariaNome: typeof payload.imobiliariaNome === 'string' ? payload.imobiliariaNome : undefined,
  };
}

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
    data?.user ??
    getUserFromToken(token ?? '', payload.email);

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
