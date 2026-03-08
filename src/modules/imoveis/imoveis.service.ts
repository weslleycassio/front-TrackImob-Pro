export type ImovelStatus = 'ATIVO' | 'INATIVO';

export interface Imovel {
  id: string;
  titulo: string;
  tipo: string;
  finalidade: string;
  bairro: string;
  cidade: string;
  preco: number;
  descricao: string;
  status: ImovelStatus;
  createdAt: Date;
}

export interface ImoveisListFilters {
  cidade?: string;
  bairro?: string;
  tipo?: string;
  finalidade?: string;
  status?: ImovelStatus;
  precoMin?: number;
  precoMax?: number;
}

export interface ImoveisPagination {
  page: number;
  limit: number;
}

export interface ImoveisListResult {
  data: Imovel[];
  total: number;
  page: number;
  limit: number;
}

interface PrismaImovelModel {
  findMany(params: {
    where: Record<string, unknown>;
    orderBy: { createdAt: 'desc' };
    skip: number;
    take: number;
  }): Promise<Imovel[]>;
  count(params: { where: Record<string, unknown> }): Promise<number>;
  findUnique(params: { where: { id: string } }): Promise<Imovel | null>;
}

export interface PrismaClientLike {
  imovel: PrismaImovelModel;
}

export class ResourceNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResourceNotFoundError';
  }
}

export class ImoveisService {
  constructor(private readonly prisma: PrismaClientLike) {}

  async list(filters: ImoveisListFilters, pagination: ImoveisPagination): Promise<ImoveisListResult> {
    const where = this.buildWhere(filters);
    const skip = (pagination.page - 1) * pagination.limit;

    const [data, total] = await Promise.all([
      this.prisma.imovel.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pagination.limit,
      }),
      this.prisma.imovel.count({ where }),
    ]);

    return {
      data,
      total,
      page: pagination.page,
      limit: pagination.limit,
    };
  }

  async findById(id: string): Promise<Imovel> {
    const imovel = await this.prisma.imovel.findUnique({ where: { id } });

    if (!imovel) {
      throw new ResourceNotFoundError('Imóvel não encontrado');
    }

    return imovel;
  }

  private buildWhere(filters: ImoveisListFilters): Record<string, unknown> {
    const where: Record<string, unknown> = {};

    if (filters.cidade) {
      where.cidade = { equals: filters.cidade, mode: 'insensitive' };
    }

    if (filters.bairro) {
      where.bairro = { equals: filters.bairro, mode: 'insensitive' };
    }

    if (filters.tipo) {
      where.tipo = { equals: filters.tipo, mode: 'insensitive' };
    }

    if (filters.finalidade) {
      where.finalidade = { equals: filters.finalidade, mode: 'insensitive' };
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.precoMin !== undefined || filters.precoMax !== undefined) {
      const precoFilter: Record<string, number> = {};

      if (filters.precoMin !== undefined) {
        precoFilter.gte = filters.precoMin;
      }

      if (filters.precoMax !== undefined) {
        precoFilter.lte = filters.precoMax;
      }

      where.preco = precoFilter;
    }

    return where;
  }
}
