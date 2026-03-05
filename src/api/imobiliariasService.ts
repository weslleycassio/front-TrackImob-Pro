import { apiClient } from './client';

type ImobiliariaResponse = {
  id?: number;
  nome: string;
};

export async function getMinhaImobiliariaRequest(imobiliariaId?: number) {
  try {
    const { data } = await apiClient.get<ImobiliariaResponse>('/imobiliarias/me');
    return data;
  } catch {
    if (!imobiliariaId) {
      throw new Error('Imobiliária não disponível');
    }

    const { data } = await apiClient.get<ImobiliariaResponse>(`/imobiliarias/${imobiliariaId}`);
    return data;
  }
}
