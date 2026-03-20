import { apiClient } from './client';
import type { ImobiliariaSummary } from './types';

type ImobiliariaApiResponse = Record<string, unknown>;

function toImobiliariaSummary(candidate: unknown): ImobiliariaSummary {
  const record = (candidate && typeof candidate === 'object' ? candidate : {}) as ImobiliariaApiResponse;

  return {
    id: typeof record.id === 'string' || typeof record.id === 'number' ? record.id : undefined,
    nome: String(record.nome ?? record.name ?? record.razaoSocial ?? 'Imobiliaria'),
    logoUrl:
      typeof record.logoUrl === 'string'
        ? record.logoUrl
        : typeof record.logo_url === 'string'
          ? record.logo_url
          : typeof record.logo === 'string'
            ? record.logo
            : null,
  };
}

export async function getMinhaImobiliariaRequest(imobiliariaId?: string | number) {
  try {
    const { data } = await apiClient.get<ImobiliariaApiResponse>('/imobiliarias/me');
    return toImobiliariaSummary(data);
  } catch {
    if (imobiliariaId === undefined || imobiliariaId === null || imobiliariaId === '') {
      throw new Error('Imobiliaria nao disponivel');
    }

    const { data } = await apiClient.get<ImobiliariaApiResponse>(`/imobiliarias/${imobiliariaId}`);
    return toImobiliariaSummary(data);
  }
}
