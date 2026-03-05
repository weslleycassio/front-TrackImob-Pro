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

function toEntityId(value: unknown): string | number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmedValue = value.trim();
    if (trimmedValue !== '') {
      return trimmedValue;
    }
  }

  return null;
}

function normalizeRole(value: unknown): User['role'] {
  const rawRole = String(Array.isArray(value) ? value[0] : value ?? '').toUpperCase();
  return rawRole === 'ADMIN' ? 'ADMIN' : 'CORRETOR';
}

function toUser(candidate: unknown, fallbackEmail: string): User | null {
  if (!candidate || typeof candidate !== 'object') {
    return null;
  }

  const record = candidate as Record<string, unknown>;
  const userId =
    toEntityId(record.id) ??
    toEntityId(record.userId) ??
    toEntityId(record.usuarioId) ??
    toEntityId(record.user_id);
  const imobiliariaId =
    toEntityId(record.imobiliariaId) ??
    toEntityId(record.imobiliaria_id) ??
    toEntityId(record.realEstateId) ??
    toEntityId(record.companyId);

  if (!userId || !imobiliariaId) {
    return null;
  }

  return {
    id: userId,
    nome: String(record.nome ?? record.name ?? record.username ?? 'Usuário'),
    telefone: String(record.telefone ?? record.phone ?? record.celular ?? ''),
    email: String(record.email ?? record.userEmail ?? fallbackEmail),
    role: normalizeRole(record.role ?? record.roles ?? record.perfil ?? record.userRole),
    imobiliariaId,
    imobiliariaNome:
      typeof record.imobiliariaNome === 'string'
        ? record.imobiliariaNome
        : typeof record.imobiliaria_nome === 'string'
          ? record.imobiliaria_nome
          : undefined,
  };
}

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

function getUserFromToken(token: string, email: string): User | null {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  const userId =
    toEntityId(payload.id) ??
    toEntityId(payload.userId) ??
    toEntityId(payload.usuarioId) ??
    toEntityId(payload.sub);
  const imobiliariaId =
    toEntityId(payload.imobiliariaId) ??
    toEntityId(payload.realEstateId) ??
    toEntityId(payload.companyId);

  if (!userId || !imobiliariaId) {
    return null;
  }

  const role = normalizeRole(payload.role ?? payload.roles ?? payload.perfil ?? payload.userRole);

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
  const userCandidate =
    authPayload?.user ?? authPayload?.usuario ?? authPayload?.admin ?? authPayload?.profile ?? data?.user;
  const user = toUser(userCandidate, payload.email) ?? getUserFromToken(token ?? '', payload.email);

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
