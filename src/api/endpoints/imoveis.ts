export const imoveisEndpoints = {
  create: '/imoveis',
  list: '/imoveis',
  detail: (imovelId: string | number) => `/imoveis/${imovelId}`,
  publicDetail: (imovelId: string | number) => `/public/imoveis/${imovelId}`,
  update: (imovelId: string | number) => `/imoveis/${imovelId}`,
  activate: (imovelId: string | number) => `/imoveis/${imovelId}/ativar`,
  dadosCaptacao: (imovelId: string | number) => `/imoveis/${imovelId}/dados-captacao`,
  uploadImages: (imovelId: string | number) => `/imoveis/${imovelId}/imagens`,
  deleteImage: (imovelId: string | number, imagemId: string | number) => `/imoveis/${imovelId}/imagens/${imagemId}`,
};
