import { apiClient } from '../api/client';
import { imoveisEndpoints } from '../api/endpoints/imoveis';

export type FinalidadeImovel = 'Venda' | 'Locação';
export type StatusImovel = 'ATIVO' | 'INATIVO';
export type TipoImovel = 'Apartamento' | 'Casa' | 'Sobrado' | 'Terreno' | 'Comercial' | 'Outro';

export type ImagemImovel = {
  id: string;
  url: string;
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

export async function createImovel(payload: CreateImovelPayload) {
  const { data } = await apiClient.post<CreateImovelResponse>(imoveisEndpoints.create, payload);
  return data;
}

export async function createImovelWithImages(payload: CreateImovelPayload, files: File[]) {
  const createResponse = await createImovel(payload);
  const imovelId = extractImovelId(createResponse);

  if (!imovelId || files.length === 0) {
    return createResponse;
  }

  await uploadImovelImages(imovelId, files);
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

  const { data } = await apiClient.get<GetImoveisResponse>(imoveisEndpoints.list, { params });
  return data;
}

export async function getImovelById(imovelId: string | number) {
  const { data } = await apiClient.get<Imovel>(imoveisEndpoints.detail(imovelId));
  return data;
}

export async function uploadImovelImages(
  imovelId: string | number,
  files: File[],
  onUploadProgress?: (progress: number) => void,
) {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append('images', file);
  });

  const { data } = await apiClient.post(imoveisEndpoints.uploadImages(imovelId), formData, {
    onUploadProgress: (event) => {
      if (!event.total) return;
      const progress = Math.round((event.loaded * 100) / event.total);
      onUploadProgress?.(progress);
    },
  });

  return data;
}

export function extractImovelId(response: CreateImovelResponse) {
  return response.id ?? response.imovel?.id;
}
