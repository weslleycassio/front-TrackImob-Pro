export const localidadesEndpoints = {
  estados: '/localizacao/estados',
  cidadesPorEstado: (uf: string) => `/localizacao/estados/${uf.toLowerCase()}/cidades`,
};
