import { apiClient } from '../api/client';
import { imoveisEndpoints } from '../api/endpoints/imoveis';

export type FinalidadeImovel = 'Venda' | 'Aluguel';
export type StatusImovel = 'ATIVO' | 'INATIVO';

export type CreateImovelPayload = {
  titulo: string;
  tipo: string;
  finalidade: FinalidadeImovel;
  bairro?: string;
  cidade: string;
  preco: number;
  descricao?: string;
  status: StatusImovel;
};

type CreateImovelResponse = {
  id?: string | number;
  imovel?: {
    id?: string | number;
  };
};

export async function createImovel(payload: CreateImovelPayload) {
  const { data } = await apiClient.post<CreateImovelResponse>(imoveisEndpoints.create, payload);
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
