import { apiClient } from '../api/client';
import { imoveisEndpoints } from '../api/endpoints/imoveis';

export type FinalidadeImovel = 'Venda' | 'Locação';
export type StatusImovel = 'ATIVO' | 'INATIVO';
export type TipoImovel = 'Apartamento' | 'Casa' | 'Sobrado' | 'Terreno' | 'Comercial' | 'Outro';

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
  imagens: ImagemImovel[];
};

type RawImovel = Omit<Imovel, 'imagens'> & {
  imagens?: ImagemImovel[] | null;
  imagem?: string;
  foto?: string;
  image?: string;
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
  const { data } = await apiClient.get<RawImovel>(imoveisEndpoints.detail(imovelId));
  return normalizeImovel(data);
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
