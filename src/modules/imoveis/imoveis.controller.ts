import {
  ImoveisService,
  ImovelStatus,
  ResourceNotFoundError,
  type ImoveisListFilters,
  type ImoveisPagination,
} from './imoveis.service';

interface HttpRequest {
  params: Record<string, string | undefined>;
  query: Record<string, string | undefined>;
}

interface HttpResponse {
  status(code: number): HttpResponse;
  json(payload: unknown): void;
}

type NextFunction = (error?: unknown) => void;

class HttpValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HttpValidationError';
  }
}

export class ImoveisController {
  constructor(private readonly imoveisService: ImoveisService) {}

  list = async (req: HttpRequest, res: HttpResponse, next: NextFunction): Promise<void> => {
    try {
      const filters = this.parseFilters(req.query);
      const pagination = this.parsePagination(req.query);
      const result = await this.imoveisService.list(filters, pagination);

      res.status(200).json(result);
    } catch (error) {
      next(this.normalizeError(error));
    }
  };

  getById = async (req: HttpRequest, res: HttpResponse, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id;

      if (!id) {
        throw new HttpValidationError('Parâmetro id é obrigatório');
      }

      const imovel = await this.imoveisService.findById(id);
      res.status(200).json(imovel);
    } catch (error) {
      next(this.normalizeError(error));
    }
  };

  private parseFilters(query: Record<string, string | undefined>): ImoveisListFilters {
    const precoMin = this.parseOptionalNumber(query.precoMin, 'precoMin');
    const precoMax = this.parseOptionalNumber(query.precoMax, 'precoMax');

    if (precoMin !== undefined && precoMax !== undefined && precoMin > precoMax) {
      throw new HttpValidationError('precoMin não pode ser maior que precoMax');
    }

    const status = this.parseStatus(query.status);

    return {
      cidade: this.normalizeText(query.cidade),
      bairro: this.normalizeText(query.bairro),
      tipo: this.normalizeText(query.tipo),
      finalidade: this.normalizeText(query.finalidade),
      status,
      precoMin,
      precoMax,
    };
  }

  private parsePagination(query: Record<string, string | undefined>): ImoveisPagination {
    const page = this.parsePositiveNumber(query.page, 'page', 1);
    const limit = this.parsePositiveNumber(query.limit, 'limit', 10);

    return { page, limit };
  }

  private parseStatus(value?: string): ImovelStatus | undefined {
    if (!value) {
      return undefined;
    }

    const status = value.trim().toUpperCase();

    if (status !== 'ATIVO' && status !== 'INATIVO') {
      throw new HttpValidationError('status deve ser ATIVO ou INATIVO');
    }

    return status;
  }

  private parsePositiveNumber(value: string | undefined, fieldName: string, fallback: number): number {
    if (value === undefined || value === '') {
      return fallback;
    }

    const parsed = Number(value);

    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
      throw new HttpValidationError(`${fieldName} deve ser um número inteiro positivo`);
    }

    return parsed;
  }

  private parseOptionalNumber(value: string | undefined, fieldName: string): number | undefined {
    if (value === undefined || value === '') {
      return undefined;
    }

    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
      throw new HttpValidationError(`${fieldName} deve ser um número válido`);
    }

    return parsed;
  }

  private normalizeText(value?: string): string | undefined {
    const normalized = value?.trim();
    return normalized ? normalized : undefined;
  }

  private normalizeError(error: unknown): unknown {
    if (error instanceof HttpValidationError) {
      return {
        statusCode: 400,
        code: error.name,
        message: error.message,
      };
    }

    if (error instanceof ResourceNotFoundError) {
      return {
        statusCode: 404,
        code: error.name,
        message: error.message,
      };
    }

    return {
      statusCode: 500,
      code: 'InternalServerError',
      message: 'Erro interno ao consultar imóveis',
    };
  }
}
