export const imoveisEndpoints = {
  create: '/imoveis',
  uploadImages: (imovelId: string | number) => `/imoveis/${imovelId}/imagens`,
};
