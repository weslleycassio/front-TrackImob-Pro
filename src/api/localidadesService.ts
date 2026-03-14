import { apiClient } from './client';
import { localidadesEndpoints } from './endpoints/localidades';

export type EstadoOption = {
  sigla: string;
  nome: string;
};

export type CidadeOption = {
  nome: string;
};

type RawEstado =
  | string
  | {
      sigla?: string;
      uf?: string;
      nome?: string;
      name?: string;
    };

type RawCidade =
  | string
  | {
      nome?: string;
      name?: string;
    };

type CollectionResponse<T> =
  | T[]
  | {
      data?: T[];
    };

const normalizeEstado = (rawEstado: RawEstado): EstadoOption | null => {
  if (typeof rawEstado === 'string') {
    const normalizedValue = rawEstado.trim().toUpperCase();

    if (!normalizedValue) {
      return null;
    }

    return {
      sigla: normalizedValue,
      nome: normalizedValue,
    };
  }

  const sigla = (rawEstado.sigla ?? rawEstado.uf ?? '').trim().toUpperCase();
  const nome = (rawEstado.nome ?? rawEstado.name ?? sigla).trim();

  if (!sigla || !nome) {
    return null;
  }

  return {
    sigla,
    nome,
  };
};

const normalizeCidade = (rawCidade: RawCidade): CidadeOption | null => {
  if (typeof rawCidade === 'string') {
    const normalizedValue = rawCidade.trim();

    if (!normalizedValue) {
      return null;
    }

    return {
      nome: normalizedValue,
    };
  }

  const nome = (rawCidade.nome ?? rawCidade.name ?? '').trim();

  if (!nome) {
    return null;
  }

  return {
    nome,
  };
};

const extractCollection = <T,>(response: CollectionResponse<T>) => {
  if (Array.isArray(response)) {
    return response;
  }

  return response.data ?? [];
};

export async function getEstadosRequest() {
  const { data } = await apiClient.get<CollectionResponse<RawEstado>>(localidadesEndpoints.estados);

  return extractCollection(data)
    .map(normalizeEstado)
    .filter((estado): estado is EstadoOption => Boolean(estado))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

export async function getCidadesByEstadoRequest(uf: string) {
  const { data } = await apiClient.get<CollectionResponse<RawCidade>>(localidadesEndpoints.cidadesPorEstado(uf));

  return extractCollection(data)
    .map(normalizeCidade)
    .filter((cidade): cidade is CidadeOption => Boolean(cidade))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}
