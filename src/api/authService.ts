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
    toNumber(record.id) ??
    toNumber(record.userId) ??
    toNumber(record.usuarioId) ??
    toNumber(record.user_id);
  const imobiliariaId =
    toNumber(record.imobiliariaId) ??
    toNumber(record.imobiliaria_id) ??
    toNumber(record.realEstateId) ??
    toNumber(record.companyId);

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
