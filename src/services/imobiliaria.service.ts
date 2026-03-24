import { apiClient } from '../api/client';
import type { ImobiliariaSummary } from '../api/types';

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

export async function getMinhaImobiliaria() {
  const { data } = await apiClient.get<ImobiliariaApiResponse>('/imobiliarias/me');
  return toImobiliariaSummary(data);
}
