import { apiClient } from '../api/client';
import { imoveisEndpoints } from '../api/endpoints/imoveis';

export type FinalidadeImovel = 'Venda' | 'Locação';
export type StatusImovel = 'ATIVO' | 'INATIVO';
export type TipoImovel = 'Apartamento' | 'Casa' | 'Sobrado' | 'Terreno' | 'Comercial' | 'Outro';
export const motivoInativacaoImovelOptions = [
  { value: 'VENDA_CONCLUIDA', label: 'Venda concluída' },
  { value: 'VENDA_OUTRA_IMOBILIARIA', label: 'Venda por outra imobiliária' },
  { value: 'ALUGADO', label: 'Alugado' },
  { value: 'ALUGADO_OUTRA_IMOBILIARIA', label: 'Alugado por outra imobiliária' },
  { value: 'DESISTIU_DA_VENDA', label: 'Desistiu da venda' },
  { value: 'DESISTIU_DA_LOCACAO', label: 'Desistiu da locação' },
  { value: 'OUTRO', label: 'Outro' },
] as const;

export type MotivoInativacaoImovel = (typeof motivoInativacaoImovelOptions)[number]['value'];

export type InativarImovelPayload = {
  motivo: MotivoInativacaoImovel;
  descricao?: string;
  responsavelFechamentoId?: string | number;
};

export type ImagemImovel = {
  id: string;
  url: string;
  key?: string;
  capa: boolean;
  ordem: number;
};

export type CreateImovelPayload = {
  titulo: string;
  tipo: TipoImovel;
  finalidade: FinalidadeImovel;
  bairro: string;
  cidade: string;
  preco: number;
  descricao: string;
  status: StatusImovel;
};

type CreateImovelResponse = {
  data?: {
    id?: string | number;
    imovel?: {
      id?: string | number;
    };
  };
  id?: string | number;
  imovel?: {
    id?: string | number;
  };
};

export type Imovel = {
  id: string | number;
  titulo: string;
  tipo: TipoImovel | string;
  finalidade: FinalidadeImovel | string;
  bairro: string;
  cidade: string;
  preco: number;
  descricao?: string;
  status: StatusImovel | string;
  createdAt?: string;
  updatedAt?: string;
  responsavelId?: string | number;
  imagens: ImagemImovel[];
};

type RawPessoaRelacionada = {
  id?: string | number;
  userId?: string | number;
  usuarioId?: string | number;
  corretorId?: string | number;
};

type RawImovel = Omit<Imovel, 'imagens' | 'responsavelId'> & {
  imagens?: ImagemImovel[] | null;
  imagem?: string;
  foto?: string;
  image?: string;
  responsavelId?: string | number;
  corretorResponsavelId?: string | number;
  corretorId?: string | number;
  usuarioId?: string | number;
  userId?: string | number;
  responsavel?: RawPessoaRelacionada | null;
  corretor?: RawPessoaRelacionada | null;
};

export type GetImoveisFilters = {
  busca?: string;
  cidade?: string;
  bairro?: string;
  tipo?: string;
  finalidade?: string;
  status?: string;
  precoMin?: number;
  precoMax?: number;
  page?: number;
  limit?: number;
};

export type GetImoveisResponse = {
  data: Imovel[];
  total?: number;
  page?: number;
  limit?: number;
};

type RawGetImoveisResponse =
  | {
      data?: RawImovel[];
      total?: number;
      page?: number;
      limit?: number;
    }
  | RawImovel[];

type RawGetImovelByIdResponse =
  | {
      data?: RawImovel;
    }
  | RawImovel;

function getUploadableFiles(files: File[]) {
  return files.filter((file) => file instanceof File && file.size > 0);
}

function normalizeImagens(rawImovel: RawImovel): ImagemImovel[] {
  if (Array.isArray(rawImovel.imagens) && rawImovel.imagens.length > 0) {
    return rawImovel.imagens
      .filter((imagem): imagem is ImagemImovel => Boolean(imagem?.id && imagem?.url))
      .sort((a, b) => {
        if (a.capa !== b.capa) {
          return a.capa ? -1 : 1;
        }

        return a.ordem - b.ordem;
      });
  }

  const fallbackUrl = rawImovel.imagem ?? rawImovel.foto ?? rawImovel.image;

  if (!fallbackUrl) {
    return [];
  }

  return [
    {
      id: `fallback-${rawImovel.id}`,
      url: fallbackUrl,
      capa: true,
      ordem: 0,
    },
  ];
}

function normalizeImovel(rawImovel: RawImovel): Imovel {
  return {
    ...rawImovel,
    responsavelId:
      rawImovel.responsavelId ??
      rawImovel.corretorResponsavelId ??
      rawImovel.corretorId ??
      rawImovel.usuarioId ??
      rawImovel.userId ??
      rawImovel.responsavel?.id ??
      rawImovel.responsavel?.userId ??
      rawImovel.responsavel?.usuarioId ??
      rawImovel.responsavel?.corretorId ??
      rawImovel.corretor?.id ??
      rawImovel.corretor?.userId ??
      rawImovel.corretor?.usuarioId ??
      rawImovel.corretor?.corretorId,
    imagens: normalizeImagens(rawImovel),
  };
}

export async function createImovel(payload: CreateImovelPayload) {
  const { data } = await apiClient.post<CreateImovelResponse>(imoveisEndpoints.create, payload);
  return data;
}

export async function createImovelWithImages(payload: CreateImovelPayload, files: File[]) {
  const createResponse = await createImovel(payload);
  const imovelId = extractImovelId(createResponse);
  const uploadableFiles = getUploadableFiles(files);

  if (!imovelId || uploadableFiles.length === 0) {
    return createResponse;
  }

  await uploadImovelImages(imovelId, uploadableFiles);
  return createResponse;
}

export async function getImoveis(filters: GetImoveisFilters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    params.set(key, String(value));
  });

  const { data } = await apiClient.get<RawGetImoveisResponse>(imoveisEndpoints.list, { params });

  if (Array.isArray(data)) {
    return {
      data: data.map(normalizeImovel),
      total: data.length,
      page: filters.page,
      limit: filters.limit,
    } satisfies GetImoveisResponse;
  }

  return {
    ...data,
    data: (data.data ?? []).map(normalizeImovel),
  } satisfies GetImoveisResponse;
}

export async function getImovelById(imovelId: string | number) {
  const { data } = await apiClient.get<RawGetImovelByIdResponse>(imoveisEndpoints.detail(imovelId));
  const rawImovel = (data as { data?: RawImovel }).data ?? (data as RawImovel);

  return normalizeImovel(rawImovel);
}

export async function inativarImovel(imovelId: string | number, payload: InativarImovelPayload) {
  const { data } = await apiClient.delete(imoveisEndpoints.detail(imovelId), {
    data: payload,
  });

  return data;
}

export async function uploadImovelImages(
  imovelId: string | number,
  files: File[],
  onUploadProgress?: (progress: number) => void,
) {
  const uploadableFiles = getUploadableFiles(files);

  if (uploadableFiles.length === 0) {
    return null;
  }

  const formData = new FormData();

  uploadableFiles.forEach((file) => {
    formData.append('imagens', file);
  });

  const { data } = await apiClient.post(imoveisEndpoints.uploadImages(imovelId), formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (event) => {
      if (!event.total) return;
      const progress = Math.round((event.loaded * 100) / event.total);
      onUploadProgress?.(progress);
    },
  });

  return data;
}

export function extractImovelId(response: CreateImovelResponse) {
  return response.id ?? response.imovel?.id ?? response.data?.id ?? response.data?.imovel?.id;
}
