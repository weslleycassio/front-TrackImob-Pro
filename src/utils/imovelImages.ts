import type { ImagemImovel } from '../services/imoveisService';

export const IMOVEL_PLACEHOLDER_IMAGE = '/placeholder.png';

export function orderImagensByCapa(imagens?: ImagemImovel[]) {
  if (!imagens || imagens.length === 0) {
    return [];
  }

  return [...imagens].sort((a, b) => {
    if (a.capa !== b.capa) {
      return a.capa ? -1 : 1;
    }

    return a.ordem - b.ordem;
  });
}
