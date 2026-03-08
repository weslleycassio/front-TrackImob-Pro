import { apiClient } from '../api/client';
import { imoveisEndpoints } from '../api/endpoints/imoveis';

export type FinalidadeImovel = 'Venda' | 'Locação';
export type StatusImovel = 'ATIVO' | 'INATIVO';
export type TipoImovel = 'Apartamento' | 'Casa' | 'Sobrado' | 'Terreno' | 'Comercial' | 'Outro';

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

export async function uploadImovelImages(
  imovelId: string | number,
  files: File[],
  onUploadProgress?: (progress: number) => void,
) {
  const formData = new FormData();

  files.forEach((file) => {
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
  return response.id ?? response.imovel?.id;
}
