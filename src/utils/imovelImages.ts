import type { ImagemImovel } from '../services/imoveisService';

const API_URL =
  import.meta.env.VITE_API_URL ||
  // @ts-expect-error fallback for CRA-style env var
  process.env.REACT_APP_API_URL;

export const IMOVEL_PLACEHOLDER_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='360' viewBox='0 0 640 360'%3E%3Crect width='640' height='360' fill='%23f2f4f7'/%3E%3Cpath d='M210 226l74-82 56 62 38-42 52 62H210z' fill='%23c9d2dd'/%3E%3Ccircle cx='258' cy='120' r='24' fill='%23d8dee7'/%3E%3Ctext x='320' y='300' text-anchor='middle' font-size='22' fill='%2362768a' font-family='Arial, sans-serif'%3ESem imagem disponível%3C/text%3E%3C/svg%3E";

export function resolveImageSrc(src?: string): string {
  if (!src) return '/placeholder-imovel.png';

  const normalizedSrc = src.trim();

  if (
    normalizedSrc.startsWith('http://') ||
    normalizedSrc.startsWith('https://') ||
    normalizedSrc.startsWith('data:image') ||
    normalizedSrc.startsWith('/')
  ) {
    return normalizedSrc;
  }

  if (!API_URL) {
    return `/${normalizedSrc}`;
  }

  return `${API_URL.replace(/\/+$/, '')}/${normalizedSrc.replace(/^\/+/, '')}`;
}

export function getImovelImagemPrincipal(imagens?: ImagemImovel[]) {
  if (!imagens || imagens.length === 0) {
    return IMOVEL_PLACEHOLDER_IMAGE;
  }

  const imagemCapa = imagens.find((imagem) => imagem.capa && imagem.url);

  if (imagemCapa?.url) {
    return resolveImageSrc(imagemCapa.url);
  }

  return resolveImageSrc(imagens[0]?.url) || IMOVEL_PLACEHOLDER_IMAGE;
}

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
