export const imoveisEndpoints = {
  create: '/imoveis',
  list: '/imoveis',
  detail: (imovelId: string | number) => `/imoveis/${imovelId}`,
  dadosCaptacao: (imovelId: string | number) => `/imoveis/${imovelId}/dados-captacao`,
  uploadImages: (imovelId: string | number) => `/imoveis/${imovelId}/imagens`,
};
