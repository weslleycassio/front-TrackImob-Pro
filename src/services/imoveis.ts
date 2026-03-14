import { apiClient } from '../api/client';
import { imoveisEndpoints } from '../api/endpoints/imoveis';

export type FinalidadeImovel = 'Venda' | 'Locação';
export type StatusImovel = 'ATIVO' | 'INATIVO';
export type TipoImovel = 'Apartamento' | 'Casa' | 'Sobrado' | 'Assobradado' | 'Terreno' | 'Comercial' | 'Planta' | 'Outro';
export const motivoInativacaoImovelOptions = [
  { value: 'VENDA_CONCLUIDA', label: 'Venda concluída' },
  { value: 'VENDA_OUTRA_IMOBILIARIA', label: 'Venda por outra imobiliária' },
  { value: 'ALUGADO', label: 'Alugado' },
  { value: 'ALUGADO_OUTRA_IMOBILIARIA', label: 'Alugado por outra imobiliária' },
  { value: 'DESISTIU_DA_VENDA', label: 'Desistiu da venda' },
  { value: 'DESISTIU_DA_LOCACAO', label: 'Desistiu da locação' },
  { value: 'OUTRO', label: 'Outro' },
] as const;

export type MotivoInativacaoImovel = (typeof motivoInativacaoImovelOptions)[number]['value'];

export type InativarImovelPayload = {
  motivo: MotivoInativacaoImovel;
  descricao?: string;
  responsavelFechamentoId?: string | number;
};

export type ImagemImovel = {
  id: string;
  url: string;
  key?: string;
  capa: boolean;
  ordem: number;
};

export type UsuarioResumo = {
  id: string | number;
  nome: string;
  perfil: string;
};

export type CreateImovelPayload = {
  titulo: string;
  tipo: TipoImovel;
  finalidade: FinalidadeImovel;
  estado: string;
  bairro: string;
  cidade: string;
  preco: number;
  descricao: string;
  status: StatusImovel;
  corretorCaptadorId: string | number;
  quartos?: number | null;
  metragem?: number | null;
  vagasGaragem?: number | null;
  banheiros?: number | null;
  suites?: number | null;
  linkExternoFotos?: string | null;
  linkExternoVideos?: string | null;
  nomeProprietario?: string | null;
  telefoneProprietario?: string | null;
  enderecoCaptacao?: string | null;
};

type CreateImovelResponse = {
  data?: {
    id?: string | number;
    imovel?: {
      id?: string | number;
    };
  };
  id?: string | number;
  imovel?: {
    id?: string | number;
  };
};

export type Imovel = {
  id: string | number;
  titulo: string;
  tipo: TipoImovel | string;
  finalidade: FinalidadeImovel | string;
  estado: string;
  bairro: string;
  cidade: string;
  preco: number;
  descricao?: string;
  status: StatusImovel | string;
  createdAt?: string;
  updatedAt?: string;
  responsavelId?: string | number;
  corretorCaptadorId?: string | number;
  corretorCaptador?: UsuarioResumo | null;
  quartos?: number | null;
  metragem?: number | null;
  vagasGaragem?: number | null;
  banheiros?: number | null;
  suites?: number | null;
  linkExternoFotos?: string | null;
  linkExternoVideos?: string | null;
  imagens: ImagemImovel[];
};

export type DadosCaptacaoImovel = {
  nomeProprietario?: string | null;
  telefoneProprietario?: string | null;
  enderecoCaptacao?: string | null;
};

type RawPessoaRelacionada = {
  id?: string | number;
  userId?: string | number;
  usuarioId?: string | number;
  corretorId?: string | number;
};

type RawUsuarioResumo = RawPessoaRelacionada & {
  nome?: string;
  name?: string;
  perfil?: string;
  role?: string;
};

type RawImovel = Omit<Imovel, 'imagens' | 'responsavelId' | 'corretorCaptador' | 'estado'> & {
  estado?: string;
  uf?: string;
  estadoSigla?: string;
  estadoNome?: string;
  imagens?: ImagemImovel[] | null;
  imagem?: string;
  foto?: string;
  image?: string;
  responsavelId?: string | number;
  corretorResponsavelId?: string | number;
  corretorId?: string | number;
  usuarioId?: string | number;
  userId?: string | number;
  responsavel?: RawPessoaRelacionada | null;
  corretor?: RawPessoaRelacionada | null;
  captadorId?: string | number;
  corretorCaptador?: RawUsuarioResumo | null;
};

export type GetImoveisFilters = {
  busca?: string;
  estado?: string;
  cidade?: string;
  bairro?: string;
  tipo?: string;
  finalidade?: string;
  status?: string;
  precoMin?: number;
  precoMax?: number;
  page?: number;
  limit?: number;
};

export type GetImoveisResponse = {
  data: Imovel[];
  total?: number;
  page?: number;
  limit?: number;
};

type RawGetImoveisResponse =
  | {
      data?: RawImovel[];
      total?: number;
      page?: number;
      limit?: number;
    }
  | RawImovel[];

type RawGetImovelByIdResponse =
  | {
      data?: RawImovel;
    }
  | RawImovel;

type RawDadosCaptacaoImovel = DadosCaptacaoImovel & {
  proprietarioNome?: string | null;
  proprietarioTelefone?: string | null;
  endereco?: string | null;
};

type RawGetDadosCaptacaoImovelResponse =
  | {
      data?: RawDadosCaptacaoImovel | null;
    }
  | RawDadosCaptacaoImovel
  | null;

function getUploadableFiles(files: File[]) {
  return files.filter((file) => file instanceof File && file.size > 0);
}

function normalizeImagens(rawImovel: RawImovel): ImagemImovel[] {
  if (Array.isArray(rawImovel.imagens) && rawImovel.imagens.length > 0) {
    return rawImovel.imagens
      .filter((imagem): imagem is ImagemImovel => Boolean(imagem?.id && imagem?.url))
      .sort((a, b) => {
        if (a.capa !== b.capa) {
          return a.capa ? -1 : 1;
        }

        return a.ordem - b.ordem;
      });
  }

  const fallbackUrl = rawImovel.imagem ?? rawImovel.foto ?? rawImovel.image;

  if (!fallbackUrl) {
    return [];
  }

  return [
    {
      id: `fallback-${rawImovel.id}`,
      url: fallbackUrl,
      capa: true,
      ordem: 0,
    },
  ];
}

function normalizeUsuarioResumo(usuario?: RawUsuarioResumo | null): UsuarioResumo | null {
  if (!usuario) {
    return null;
  }

  const id = usuario.id ?? usuario.userId ?? usuario.usuarioId ?? usuario.corretorId;
  const nome = usuario.nome ?? usuario.name;
  const perfil = usuario.perfil ?? usuario.role;

  if (id === undefined || !nome || !perfil) {
    return null;
  }

  return {
    id,
    nome,
    perfil,
  };
}

function normalizeImovel(rawImovel: RawImovel): Imovel {
  const corretorCaptador = normalizeUsuarioResumo(rawImovel.corretorCaptador);

  return {
    ...rawImovel,
    estado: rawImovel.estado ?? rawImovel.uf ?? rawImovel.estadoSigla ?? rawImovel.estadoNome ?? '',
    responsavelId:
      rawImovel.responsavelId ??
      rawImovel.corretorResponsavelId ??
      rawImovel.corretorId ??
      rawImovel.usuarioId ??
      rawImovel.userId ??
      rawImovel.responsavel?.id ??
      rawImovel.responsavel?.userId ??
      rawImovel.responsavel?.usuarioId ??
      rawImovel.responsavel?.corretorId ??
      rawImovel.corretor?.id ??
      rawImovel.corretor?.userId ??
      rawImovel.corretor?.usuarioId ??
      rawImovel.corretor?.corretorId,
    corretorCaptadorId:
      rawImovel.corretorCaptadorId ??
      rawImovel.captadorId ??
      corretorCaptador?.id,
    corretorCaptador,
    imagens: normalizeImagens(rawImovel),
  };
}

function normalizeDadosCaptacao(rawDadosCaptacao?: RawDadosCaptacaoImovel | null): DadosCaptacaoImovel {
  if (!rawDadosCaptacao) {
    return {
      nomeProprietario: null,
      telefoneProprietario: null,
      enderecoCaptacao: null,
    };
  }

  return {
    nomeProprietario: rawDadosCaptacao.nomeProprietario ?? rawDadosCaptacao.proprietarioNome ?? null,
    telefoneProprietario: rawDadosCaptacao.telefoneProprietario ?? rawDadosCaptacao.proprietarioTelefone ?? null,
    enderecoCaptacao: rawDadosCaptacao.enderecoCaptacao ?? rawDadosCaptacao.endereco ?? null,
  };
}

export async function createImovel(payload: CreateImovelPayload) {
  const { data } = await apiClient.post<CreateImovelResponse>(imoveisEndpoints.create, payload);
  return data;
}

export async function createImovelWithImages(payload: CreateImovelPayload, files: File[]) {
  const createResponse = await createImovel(payload);
  const imovelId = extractImovelId(createResponse);
  const uploadableFiles = getUploadableFiles(files);

  if (!imovelId || uploadableFiles.length === 0) {
    return createResponse;
  }

  await uploadImovelImages(imovelId, uploadableFiles);
  return createResponse;
}

export async function getImoveis(filters: GetImoveisFilters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    params.set(key, String(value));
  });

  const { data } = await apiClient.get<RawGetImoveisResponse>(imoveisEndpoints.list, { params });

  if (Array.isArray(data)) {
    return {
      data: data.map(normalizeImovel),
      total: data.length,
      page: filters.page,
      limit: filters.limit,
    } satisfies GetImoveisResponse;
  }

  return {
    ...data,
    data: (data.data ?? []).map(normalizeImovel),
  } satisfies GetImoveisResponse;
}

export async function getImovelById(imovelId: string | number) {
  const { data } = await apiClient.get<RawGetImovelByIdResponse>(imoveisEndpoints.detail(imovelId));
  const rawImovel = (data as { data?: RawImovel }).data ?? (data as RawImovel);

  return normalizeImovel(rawImovel);
}

export async function getDadosCaptacaoImovel(imovelId: string | number) {
  const { data } = await apiClient.get<RawGetDadosCaptacaoImovelResponse>(imoveisEndpoints.dadosCaptacao(imovelId));
  const rawDadosCaptacao = (data as { data?: RawDadosCaptacaoImovel | null })?.data ?? (data as RawDadosCaptacaoImovel | null);

  return normalizeDadosCaptacao(rawDadosCaptacao);
}

export async function inativarImovel(imovelId: string | number, payload: InativarImovelPayload) {
  const { data } = await apiClient.delete(imoveisEndpoints.detail(imovelId), {
    data: payload,
  });

  return data;
}

export async function uploadImovelImages(
  imovelId: string | number,
  files: File[],
  onUploadProgress?: (progress: number) => void,
) {
  const uploadableFiles = getUploadableFiles(files);

  if (uploadableFiles.length === 0) {
    return null;
  }

  const formData = new FormData();

  uploadableFiles.forEach((file) => {
    formData.append('imagens', file);
  });

  const { data } = await apiClient.post(imoveisEndpoints.uploadImages(imovelId), formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (event) => {
      if (!event.total) return;
      const progress = Math.round((event.loaded * 100) / event.total);
      onUploadProgress?.(progress);
    },
  });

  return data;
}

export function extractImovelId(response: CreateImovelResponse) {
  return response.id ?? response.imovel?.id ?? response.data?.id ?? response.data?.imovel?.id;
}
