export const imoveisEndpoints = {
  create: '/imoveis',
  list: '/imoveis',
  detail: (imovelId: string | number) => `/imoveis/${imovelId}`,
  uploadImages: (imovelId: string | number) => `/imoveis/${imovelId}/imagens`,
};
