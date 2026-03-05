import { apiClient } from './client';

type ImobiliariaResponse = {
  id?: string | number;
  nome: string;
};

export async function getMinhaImobiliariaRequest(imobiliariaId?: string | number) {
  try {
    const { data } = await apiClient.get<ImobiliariaResponse>('/imobiliarias/me');
    return data;
  } catch {
    if (imobiliariaId === undefined || imobiliariaId === null || imobiliariaId === '') {
      throw new Error('Imobiliária não disponível');
    }

    const { data } = await apiClient.get<ImobiliariaResponse>(`/imobiliarias/${imobiliariaId}`);
    return data;
  }
}
