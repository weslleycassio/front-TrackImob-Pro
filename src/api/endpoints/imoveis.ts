export const imoveisEndpoints = {
  create: '/imoveis',
  list: '/imoveis',
  uploadImages: (imovelId: string | number) => `/imoveis/${imovelId}/imagens`,
};
