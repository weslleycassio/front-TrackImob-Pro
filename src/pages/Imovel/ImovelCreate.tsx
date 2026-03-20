import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import type { Resolver } from 'react-hook-form';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import type { User } from '../../api/types';
import { getCidadesByEstadoRequest, getEstadosRequest, type CidadeOption, type EstadoOption } from '../../api/localidadesService';
import { getBrokerAndAdminUsersRequest, getLoggedUserRequest } from '../../api/usersService';
import { useAuth } from '../../auth/useAuth';
import {
  createImovel,
  extractImovelId,
  getImovelById,
  type Imovel,
  type FinalidadeImovel,
  type StatusImovel,
  type TipoImovel,
  type UpdateImovelPayload,
  updateImovel,
  uploadImovelImages,
} from '../../services/imoveis';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { toFriendlyError } from '../../utils/errorMessages';
import { canEditImovel } from '../../utils/imovelPermissions';

const tiposDeImovel = ['Apartamento', 'Casa', 'Sobrado', 'Assobradado', 'Terreno', 'Comercial', 'Planta', 'Outro'] as const;
const FINALIDADE_LOCACAO = 'Loca\u00e7\u00e3o' as const;
const STATUS_OPTIONS = ['ATIVO', 'INATIVO'] as const;

const optionalIntegerField = (fieldName: string) =>
  z.preprocess(
    (value) => {
      if (value === '' || value === null || value === undefined) {
        return undefined;
      }

      return Number(value);
    },
    z
      .number({ invalid_type_error: `${fieldName} deve ser um valor valido` })
      .int(`${fieldName} deve ser um numero inteiro`)
      .min(0, `${fieldName} nao pode ser negativo`)
      .optional(),
  );

const optionalNumberField = (fieldName: string) =>
  z.preprocess(
    (value) => {
      if (value === '' || value === null || value === undefined) {
        return undefined;
      }

      return Number(value);
    },
    z
      .number({ invalid_type_error: `${fieldName} deve ser um valor valido` })
      .min(0, `${fieldName} nao pode ser negativo`)
      .optional(),
  );

const optionalStringField = () =>
  z.preprocess(
    (value) => {
      if (typeof value !== 'string') {
        return value;
      }

      const trimmedValue = value.trim();
      return trimmedValue === '' ? undefined : trimmedValue;
    },
    z.string().optional(),
  );

const optionalExternalLinkField = (fieldLabel: string) =>
  z.preprocess(
    (value) => {
      if (value === null || value === undefined) {
        return undefined;
      }

      if (typeof value !== 'string') {
        return value;
      }

      const trimmedValue = value.trim();
      return trimmedValue === '' ? undefined : trimmedValue;
    },
    z.string().url(`${fieldLabel} deve ser uma URL valida`).optional(),
  );

const imovelCommonSchema = z.object({
  titulo: z.string().trim().min(1, 'Titulo e obrigatorio'),
  tipo: z.enum(tiposDeImovel, { required_error: 'Tipo e obrigatorio' }),
  finalidade: z.enum(['Venda', FINALIDADE_LOCACAO], {
    required_error: 'Finalidade e obrigatoria',
  }),
  estado: z.string().trim().min(1, 'Estado e obrigatorio'),
  bairro: z.string().trim().min(1, 'Bairro e obrigatorio'),
  cidade: z.string().trim().min(1, 'Cidade e obrigatoria'),
  preco: z.number({ invalid_type_error: 'Preco deve ser um valor valido' }).positive('Preco deve ser maior que zero'),
  descricao: z.string().trim().min(1, 'Descricao e obrigatoria'),
  quartos: optionalIntegerField('Quartos'),
  metragem: optionalNumberField('Metragem'),
  vagasGaragem: optionalIntegerField('Vagas de garagem'),
  banheiros: optionalIntegerField('Banheiros'),
  suites: optionalIntegerField('Suites'),
  linkExternoFotos: optionalExternalLinkField('Link externo de fotos'),
  linkExternoVideos: optionalExternalLinkField('Link externo de videos'),
});

const imovelCreateSchema = imovelCommonSchema.extend({
  status: z.enum(STATUS_OPTIONS, {
    required_error: 'Status e obrigatorio',
  }),
  corretorCaptadorId: z.string().trim().min(1, 'Corretor captador e obrigatorio'),
  nomeProprietario: optionalStringField(),
  telefoneProprietario: optionalStringField(),
  enderecoCaptacao: optionalStringField(),
});

const imovelEditSchema = imovelCommonSchema.extend({
  status: z.enum(STATUS_OPTIONS).optional(),
  corretorCaptadorId: z.string().optional(),
  nomeProprietario: optionalStringField(),
  telefoneProprietario: optionalStringField(),
  enderecoCaptacao: optionalStringField(),
});

type ImovelFormValues = z.infer<typeof imovelCreateSchema>;

type PreviewFile = {
  file: File;
  previewUrl: string;
};

type FormSectionProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

function FormSection({ title, subtitle, children }: FormSectionProps) {
  return (
    <Card className="form-section-card" title={title} subtitle={subtitle}>
      {children}
    </Card>
  );
}

type ImovelFormMode = 'create' | 'edit';

const MAX_IMAGES = 10;
const MAX_IMAGE_SIZE_MB = 5;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const formatCurrencyFromDigits = (digits: string) => {
  const onlyNumbers = digits.replace(/\D/g, '');
  const value = Number(onlyNumbers || '0') / 100;

  return {
    formatted: currencyFormatter.format(value),
    numeric: value,
  };
};

const parseCurrencyToNumber = (formattedValue: string) => {
  const sanitized = formattedValue.replace(/\s/g, '').replace('R$', '').replace(/\./g, '').replace(',', '.');
  const value = Number(sanitized);

  return Number.isNaN(value) ? 0 : value;
};

const onlyDigits = (value: string) => value.replace(/\D/g, '');

const formatPhone = (value: string) => {
  const numbers = onlyDigits(value).slice(0, 11);

  if (numbers.length <= 2) {
    return numbers;
  }

  if (numbers.length <= 10) {
    return numbers.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2').slice(0, 14);
  }

  return numbers.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 15);
};

function getDefaultFormValues(defaultCorretorCaptadorId: string): ImovelFormValues {
  return {
    titulo: '',
    tipo: 'Apartamento',
    finalidade: 'Venda',
    estado: '',
    bairro: '',
    cidade: '',
    preco: 0,
    descricao: '',
    status: 'ATIVO',
    corretorCaptadorId: defaultCorretorCaptadorId,
    quartos: undefined,
    metragem: undefined,
    vagasGaragem: undefined,
    banheiros: undefined,
    suites: undefined,
    linkExternoFotos: '',
    linkExternoVideos: '',
    nomeProprietario: undefined,
    telefoneProprietario: undefined,
    enderecoCaptacao: undefined,
  };
}

function getTipoValue(tipo?: string | null): TipoImovel {
  return tiposDeImovel.includes((tipo ?? '') as TipoImovel) ? ((tipo ?? 'Apartamento') as TipoImovel) : 'Apartamento';
}

function getFinalidadeValue(finalidade?: string | null): FinalidadeImovel {
  return finalidade === FINALIDADE_LOCACAO ? FINALIDADE_LOCACAO : 'Venda';
}

function getStatusValue(status?: string | null): StatusImovel {
  return status === 'INATIVO' ? 'INATIVO' : 'ATIVO';
}

function mapImovelToFormValues(imovel: Imovel, defaultCorretorCaptadorId: string): ImovelFormValues {
  return {
    ...getDefaultFormValues(defaultCorretorCaptadorId),
    titulo: imovel.titulo ?? '',
    tipo: getTipoValue(imovel.tipo),
    finalidade: getFinalidadeValue(imovel.finalidade),
    estado: imovel.estado ?? '',
    bairro: imovel.bairro ?? '',
    cidade: imovel.cidade ?? '',
    preco: typeof imovel.preco === 'number' && Number.isFinite(imovel.preco) ? imovel.preco : 0,
    descricao: imovel.descricao ?? '',
    status: getStatusValue(imovel.status),
    corretorCaptadorId:
      imovel.corretorCaptadorId !== undefined && imovel.corretorCaptadorId !== null
        ? String(imovel.corretorCaptadorId)
        : defaultCorretorCaptadorId,
    quartos: imovel.quartos ?? undefined,
    metragem: imovel.metragem ?? undefined,
    vagasGaragem: imovel.vagasGaragem ?? undefined,
    banheiros: imovel.banheiros ?? undefined,
    suites: imovel.suites ?? undefined,
    linkExternoFotos: imovel.linkExternoFotos ?? '',
    linkExternoVideos: imovel.linkExternoVideos ?? '',
    nomeProprietario: undefined,
    telefoneProprietario: undefined,
    enderecoCaptacao: undefined,
  };
}

function sanitizeOptionalPayloadString(value?: string | null): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  const trimmedValue = value.trim();
  return trimmedValue === '' ? undefined : trimmedValue;
}

function buildUpdatePayload(data: ImovelFormValues, precoInput: string): UpdateImovelPayload {
  const linkExternoFotos = sanitizeOptionalPayloadString(data.linkExternoFotos);
  const linkExternoVideos = sanitizeOptionalPayloadString(data.linkExternoVideos);

  return {
    titulo: data.titulo,
    tipo: data.tipo,
    finalidade: data.finalidade,
    estado: data.estado,
    bairro: data.bairro,
    cidade: data.cidade,
    preco: parseCurrencyToNumber(precoInput),
    descricao: data.descricao,
    quartos: data.quartos,
    metragem: data.metragem,
    vagasGaragem: data.vagasGaragem,
    banheiros: data.banheiros,
    suites: data.suites,
    ...(linkExternoFotos ? { linkExternoFotos } : {}),
    ...(linkExternoVideos ? { linkExternoVideos } : {}),
  };
}

function ImovelFormPage({ mode }: { mode: ImovelFormMode }) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<PreviewFile[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [precoInput, setPrecoInput] = useState('R$ 0,00');
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('Imovel cadastrado com sucesso.');
  const [corretoresCaptadores, setCorretoresCaptadores] = useState<User[]>([]);
  const [isLoadingCorretoresCaptadores, setIsLoadingCorretoresCaptadores] = useState(false);
  const [corretoresCaptadoresError, setCorretoresCaptadoresError] = useState<string | null>(null);
  const [estados, setEstados] = useState<EstadoOption[]>([]);
  const [cidades, setCidades] = useState<CidadeOption[]>([]);
  const [isLoadingEstados, setIsLoadingEstados] = useState(false);
  const [isLoadingCidades, setIsLoadingCidades] = useState(false);
  const [estadosError, setEstadosError] = useState<string | null>(null);
  const [cidadesError, setCidadesError] = useState<string | null>(null);
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(mode === 'edit');
  const isCreateMode = mode === 'create';
  const isEditMode = mode === 'edit';
  const isCorretor = user?.role === 'CORRETOR';
  const defaultCorretorCaptadorId = user?.role === 'CORRETOR' ? String(user.id) : '';
  const preserveCidadeOnStateLoadRef = useRef(false);

  const formResolver = useMemo(
    () => zodResolver(isCreateMode ? imovelCreateSchema : imovelEditSchema) as Resolver<ImovelFormValues>,
    [isCreateMode],
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ImovelFormValues>({
    resolver: formResolver,
    defaultValues: getDefaultFormValues(defaultCorretorCaptadorId),
  });

  const isBusy = useMemo(() => isSubmitting || uploadProgress > 0, [isSubmitting, uploadProgress]);
  const selectedEstado = watch('estado');
  const selectedCorretorCaptadorId = watch('corretorCaptadorId');
  const pageTitle = isCreateMode ? 'Cadastrar Imovel' : 'Editar Imovel';
  const backPath = isEditMode ? (id ? `/imoveis/${id}` : '/imoveis') : '/app';
  const backLabel = isEditMode ? 'Voltar para visualizacao' : 'Voltar';

  useEffect(
    () => () => {
      selectedImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    },
    [selectedImages],
  );

  useEffect(() => {
    const loadEstados = async () => {
      setIsLoadingEstados(true);
      setEstadosError(null);

      try {
        const estadosResponse = await getEstadosRequest();
        setEstados(estadosResponse);
      } catch (error) {
        setEstados([]);
        setEstadosError(toFriendlyError(error, 'Nao foi possivel carregar os estados.'));
      } finally {
        setIsLoadingEstados(false);
      }
    };

    loadEstados();
  }, []);

  useEffect(() => {
    if (!isCreateMode) {
      setCorretoresCaptadores([]);
      setCorretoresCaptadoresError(null);
      return;
    }

    const loadCorretoresCaptadores = async () => {
      setIsLoadingCorretoresCaptadores(true);
      setCorretoresCaptadoresError(null);

      try {
        if (isCorretor) {
          const loggedUser = await getLoggedUserRequest();
          setCorretoresCaptadores([loggedUser]);
          setValue('corretorCaptadorId', String(loggedUser.id), {
            shouldDirty: false,
            shouldValidate: false,
          });
          return;
        }

        const usuarios = await getBrokerAndAdminUsersRequest();
        setCorretoresCaptadores(usuarios);
      } catch (error) {
        if (isCorretor && user) {
          setCorretoresCaptadores([user]);
          setValue('corretorCaptadorId', String(user.id), {
            shouldDirty: false,
            shouldValidate: false,
          });
        } else {
          setCorretoresCaptadores([]);
          setCorretoresCaptadoresError(
            toFriendlyError(error, 'Nao foi possivel carregar os usuarios para selecionar o corretor captador.'),
          );
        }
      } finally {
        setIsLoadingCorretoresCaptadores(false);
      }
    };

    loadCorretoresCaptadores();
  }, [isCorretor, isCreateMode, setValue, user]);

  useEffect(() => {
    if (!selectedEstado) {
      setCidades([]);
      setCidadesError(null);
      setValue('cidade', '', { shouldDirty: false, shouldValidate: false });
      preserveCidadeOnStateLoadRef.current = false;
      return;
    }

    let isMounted = true;
    const shouldPreserveCidade = preserveCidadeOnStateLoadRef.current;

    setCidades([]);
    setCidadesError(null);

    if (!shouldPreserveCidade) {
      setValue('cidade', '', { shouldDirty: false, shouldValidate: false });
    }

    const loadCidades = async () => {
      setIsLoadingCidades(true);
      setCidadesError(null);

      try {
        const cidadesResponse = await getCidadesByEstadoRequest(selectedEstado);

        if (!isMounted) {
          return;
        }

        setCidades(cidadesResponse);

        if (shouldPreserveCidade) {
          const currentCidade = getValues('cidade');
          const cidadeExiste = cidadesResponse.some((cidade) => cidade.nome === currentCidade);

          if (!cidadeExiste) {
            setValue('cidade', '', { shouldDirty: false, shouldValidate: false });
          }
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setCidades([]);
        setCidadesError(toFriendlyError(error, 'Nao foi possivel carregar as cidades do estado selecionado.'));
      } finally {
        if (isMounted) {
          setIsLoadingCidades(false);
        }

        preserveCidadeOnStateLoadRef.current = false;
      }
    };

    loadCidades();

    return () => {
      isMounted = false;
    };
  }, [getValues, selectedEstado, setValue]);

  useEffect(() => {
    if (!isCorretor || !defaultCorretorCaptadorId || !isCreateMode) {
      return;
    }

    setValue('corretorCaptadorId', defaultCorretorCaptadorId, {
      shouldDirty: false,
      shouldValidate: false,
    });
  }, [defaultCorretorCaptadorId, isCorretor, isCreateMode, setValue]);

  useEffect(() => {
    if (!isEditMode) {
      setIsLoadingInitialData(false);
      setPageError(null);
      return;
    }

    if (!id) {
      setPageError('Imovel nao encontrado.');
      setIsLoadingInitialData(false);
      return;
    }

    let isMounted = true;

    const loadImovel = async () => {
      setIsLoadingInitialData(true);
      setPageError(null);
      setGlobalError(null);

      try {
        const response = await getImovelById(id);

        if (!isMounted) {
          return;
        }

        if (!canEditImovel(user, response)) {
          setPageError('Voce nao tem permissao para editar este imovel.');
          return;
        }

        preserveCidadeOnStateLoadRef.current = true;
        reset(mapImovelToFormValues(response, defaultCorretorCaptadorId));
        setPrecoInput(currencyFormatter.format(response.preco ?? 0));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (axios.isAxiosError(error) && error.response?.status === 403) {
          setPageError('Voce nao tem permissao para editar este imovel.');
        } else if (axios.isAxiosError(error) && error.response?.status === 404) {
          setPageError('Imovel nao encontrado.');
        } else {
          setPageError(toFriendlyError(error, 'Nao foi possivel carregar os dados do imovel.'));
        }
      } finally {
        if (isMounted) {
          setIsLoadingInitialData(false);
        }
      }
    };

    loadImovel();

    return () => {
      isMounted = false;
    };
  }, [defaultCorretorCaptadorId, id, isEditMode, reset, user]);

  const navigateAfterSuccess = () => {
    if (isCreateMode) {
      navigate('/imoveis', { replace: true });
      return;
    }

    if (id) {
      navigate(`/imoveis/${id}`, {
        replace: true,
        state: { successMessage: 'Imovel atualizado com sucesso.' },
      });
      return;
    }

    navigate('/imoveis', { replace: true });
  };

  useEffect(() => {
    if (!isSuccessModalOpen) {
      return;
    }

    const timeout = window.setTimeout(() => {
      navigateAfterSuccess();
    }, 1500);

    return () => window.clearTimeout(timeout);
  }, [id, isCreateMode, isSuccessModalOpen, navigate]);

  const handleImageSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';

    if (!files.length) {
      return;
    }

    const invalidTypeFiles = files.filter((file) => !ACCEPTED_IMAGE_TYPES.includes(file.type));
    if (invalidTypeFiles.length > 0) {
      setImageError('Formato invalido. Envie apenas arquivos JPG, JPEG, PNG ou WEBP.');
      return;
    }

    const maxImageSizeBytes = MAX_IMAGE_SIZE_MB * 1024 * 1024;
    const invalidSizeFiles = files.filter((file) => file.size > maxImageSizeBytes);
    if (invalidSizeFiles.length > 0) {
      setImageError(`Cada imagem deve ter no maximo ${MAX_IMAGE_SIZE_MB}MB.`);
      return;
    }

    setSelectedImages((previous) => {
      const existingKeys = new Set(previous.map((image) => `${image.file.name}-${image.file.lastModified}-${image.file.size}`));
      const newFiles = files.filter((file) => !existingKeys.has(`${file.name}-${file.lastModified}-${file.size}`));
      const availableSlots = Math.max(0, MAX_IMAGES - previous.length);
      const filesToAdd = newFiles.slice(0, availableSlots);

      if (filesToAdd.length < newFiles.length) {
        setImageError(`Limite maximo de ${MAX_IMAGES} imagens atingido.`);
      } else {
        setImageError(null);
      }

      return [
        ...previous,
        ...filesToAdd.map((file) => ({
          file,
          previewUrl: URL.createObjectURL(file),
        })),
      ];
    });

    setUploadProgress(0);
    setGlobalError(null);
  };

  const removeImage = (fileName: string, fileModified: number) => {
    setSelectedImages((previous) => {
      const target = previous.find((image) => image.file.name === fileName && image.file.lastModified === fileModified);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }

      return previous.filter((image) => image.file.name !== fileName || image.file.lastModified !== fileModified);
    });
  };

  const clearForm = () => {
    selectedImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    setSelectedImages([]);
    setUploadProgress(0);
    setImageError(null);
    setPrecoInput('R$ 0,00');
    reset(getDefaultFormValues(defaultCorretorCaptadorId));
  };

  const onSubmit = async (data: ImovelFormValues) => {
    setGlobalError(null);
    setImageError(null);

    if (isEditMode) {
      if (!id) {
        setGlobalError('Imovel nao encontrado.');
        return;
      }

      try {
        await updateImovel(id, buildUpdatePayload(data, precoInput));
        setSuccessMessage('Imovel atualizado com sucesso.');
        setIsSuccessModalOpen(true);
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 403) {
          setGlobalError('Voce nao tem permissao para editar este imovel.');
        } else {
          setGlobalError(toFriendlyError(error, 'Nao foi possivel atualizar o imovel. Verifique os dados e tente novamente.'));
        }
      }

      return;
    }

    const selectedImageFiles = selectedImages
      .map((image) => image.file)
      .filter((file) => file instanceof File && file.size > 0);

    try {
      const precoNumber = parseCurrencyToNumber(precoInput);
      const linkExternoFotos = sanitizeOptionalPayloadString(data.linkExternoFotos);
      const linkExternoVideos = sanitizeOptionalPayloadString(data.linkExternoVideos);

      const payload = {
        titulo: data.titulo,
        tipo: data.tipo,
        finalidade: data.finalidade,
        estado: data.estado,
        bairro: data.bairro,
        cidade: data.cidade,
        preco: precoNumber,
        descricao: data.descricao,
        status: data.status,
        corretorCaptadorId: isCorretor ? defaultCorretorCaptadorId : data.corretorCaptadorId,
        quartos: data.quartos,
        metragem: data.metragem,
        vagasGaragem: data.vagasGaragem,
        banheiros: data.banheiros,
        suites: data.suites,
        ...(linkExternoFotos ? { linkExternoFotos } : {}),
        ...(linkExternoVideos ? { linkExternoVideos } : {}),
        nomeProprietario: data.nomeProprietario ?? null,
        telefoneProprietario: data.telefoneProprietario ?? null,
        enderecoCaptacao: data.enderecoCaptacao ?? null,
      };

      const createdImovel = await createImovel(payload);
      const imovelId = extractImovelId(createdImovel);

      if (!selectedImageFiles.length) {
        setUploadProgress(100);
        setSuccessMessage('Imovel cadastrado com sucesso. Voce pode adicionar imagens depois.');
        clearForm();
        setIsSuccessModalOpen(true);
        return;
      }

      if (!imovelId) {
        throw new Error('Nao foi possivel identificar o imovel criado para realizar upload das imagens.');
      }

      try {
        setUploadProgress(1);
        await uploadImovelImages(imovelId, selectedImageFiles, (progress) => setUploadProgress(progress));
        setUploadProgress(100);
        setSuccessMessage('Imovel e imagens cadastrados com sucesso.');
      } catch {
        setUploadProgress(0);
        setSuccessMessage('Imovel cadastrado com sucesso, mas houve falha no upload das imagens.');
      }

      clearForm();
      setIsSuccessModalOpen(true);
    } catch (error) {
      setGlobalError(toFriendlyError(error, 'Nao foi possivel cadastrar o imovel. Verifique os dados e tente novamente.'));
    }
  };

  const handlePrecoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { formatted, numeric } = formatCurrencyFromDigits(event.target.value);
    setPrecoInput(formatted);
    setValue('preco', numeric, { shouldValidate: true, shouldDirty: true });
  };

  const handleSuccessClose = () => {
    setIsSuccessModalOpen(false);
    navigateAfterSuccess();
  };

  if (isEditMode && isLoadingInitialData) {
    return (
      <main className="content-page">
        <PageHeader
          title={pageTitle}
          subtitle="Preparando os dados do imovel para edicao."
          actions={
            <Button variant="secondary" onClick={() => navigate(backPath)}>
              {backLabel}
            </Button>
          }
        />
        <Card className="imovel-form-card">
          <div className="loading-state-card">
            <Spinner label="Carregando os dados do imóvel..." />
          </div>
        </Card>
      </main>
    );
  }

  if (isEditMode && pageError) {
    return (
      <main className="content-page">
        <PageHeader
          title={pageTitle}
          subtitle="Nao foi possivel carregar o formulario solicitado."
          actions={
            <Button variant="secondary" onClick={() => navigate(backPath)}>
              {backLabel}
            </Button>
          }
        />
        <Card className="imovel-form-card">
          <div className="global-error">{pageError}</div>
        </Card>
      </main>
    );
  }

  return (
    <main className="content-page">
      <PageHeader
        title={pageTitle}
        subtitle={isCreateMode ? 'Cadastre um novo imovel com visual mais claro e organizado.' : 'Atualize o imovel mantendo o padrao visual do sistema.'}
        actions={
          <Button variant="secondary" onClick={() => navigate(backPath)}>
            {backLabel}
          </Button>
        }
      />

      {globalError ? <div className="global-error">{globalError}</div> : null}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="imovel-form-shell">
        <FormSection title="Dados principais" subtitle="Defina as informacoes centrais do imovel.">
          <div className="form-group">
            <label htmlFor="titulo">Titulo*</label>
            <input id="titulo" type="text" placeholder="Ex: Apartamento 2 dormitorios com sacada" {...register('titulo')} />
            {errors.titulo && <span className="error-text">{errors.titulo.message}</span>}
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="tipo">Tipo*</label>
              <select id="tipo" {...register('tipo')}>
                {tiposDeImovel.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
              {errors.tipo && <span className="error-text">{errors.tipo.message}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="finalidade">Finalidade*</label>
              <select id="finalidade" {...register('finalidade')}>
                <option value="Venda">Venda</option>
                <option value={FINALIDADE_LOCACAO}>{FINALIDADE_LOCACAO}</option>
              </select>
              {errors.finalidade && <span className="error-text">{errors.finalidade.message}</span>}
            </div>
          </div>
        </FormSection>

        <FormSection title="Endereco" subtitle="Localize o imovel com dados de regiao e bairro.">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="estado">Estado*</label>
              <select id="estado" {...register('estado')} disabled={isLoadingEstados || isBusy}>
                <option value="">{isLoadingEstados ? 'Carregando estados...' : 'Selecione um estado'}</option>
                {estados.map((estado) => (
                  <option key={estado.sigla} value={estado.sigla}>
                    {estado.nome} ({estado.sigla})
                  </option>
                ))}
              </select>
              {errors.estado && <span className="error-text">{errors.estado.message}</span>}
              {estadosError && <span className="error-text">{estadosError}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="cidade">Cidade*</label>
              <select id="cidade" {...register('cidade')} disabled={!selectedEstado || isLoadingCidades || isBusy}>
                <option value="">
                  {!selectedEstado
                    ? 'Selecione um estado primeiro'
                    : isLoadingCidades
                      ? 'Carregando cidades...'
                      : 'Selecione uma cidade'}
                </option>
                {cidades.map((cidade) => (
                  <option key={cidade.nome} value={cidade.nome}>
                    {cidade.nome}
                  </option>
                ))}
              </select>
              {errors.cidade && <span className="error-text">{errors.cidade.message}</span>}
              {cidadesError && <span className="error-text">{cidadesError}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="bairro">Bairro*</label>
            <input id="bairro" type="text" {...register('bairro')} />
            {errors.bairro && <span className="error-text">{errors.bairro.message}</span>}
          </div>
        </FormSection>

        <FormSection title="Valores" subtitle="Organize preco, status e responsabilidade comercial.">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="preco">Preco*</label>
              <input
                id="preco"
                type="text"
                inputMode="numeric"
                value={precoInput}
                onChange={handlePrecoChange}
                onBlur={() => setValue('preco', parseCurrencyToNumber(precoInput), { shouldValidate: true })}
              />
              {errors.preco && <span className="error-text">{errors.preco.message}</span>}
            </div>

            {isCreateMode && (
              <div className="form-group">
                <label htmlFor="status">Status*</label>
                <select id="status" {...register('status')}>
                  <option value="ATIVO">ATIVO</option>
                  <option value="INATIVO">INATIVO</option>
                </select>
                {errors.status && <span className="error-text">{errors.status.message}</span>}
              </div>
            )}
          </div>

          <div className="form-grid">
            {isCreateMode && (
              <div className="form-group">
                <label htmlFor="corretorCaptadorId">Corretor captador*</label>
                {isCorretor ? (
                  <>
                    <input type="hidden" {...register('corretorCaptadorId')} />
                    <select
                      id="corretorCaptadorId"
                      value={selectedCorretorCaptadorId ?? ''}
                      onChange={() => undefined}
                      disabled
                    >
                      <option value="">
                        {isLoadingCorretoresCaptadores ? 'Carregando usuarios...' : 'Selecione um corretor captador'}
                      </option>
                      {corretoresCaptadores.map((usuario) => (
                        <option key={usuario.id} value={String(usuario.id)}>
                          {usuario.nome} ({usuario.role})
                        </option>
                      ))}
                    </select>
                  </>
                ) : (
                  <select
                    id="corretorCaptadorId"
                    {...register('corretorCaptadorId')}
                    disabled={isLoadingCorretoresCaptadores || isBusy}
                  >
                    <option value="">
                      {isLoadingCorretoresCaptadores ? 'Carregando usuarios...' : 'Selecione um corretor captador'}
                    </option>
                    {corretoresCaptadores.map((usuario) => (
                      <option key={usuario.id} value={String(usuario.id)}>
                        {usuario.nome} ({usuario.role})
                      </option>
                    ))}
                  </select>
                )}
                {errors.corretorCaptadorId && <span className="error-text">{errors.corretorCaptadorId.message}</span>}
                {corretoresCaptadoresError && <span className="error-text">{corretoresCaptadoresError}</span>}
              </div>
            )}
          </div>
        </FormSection>

        <FormSection title="Caracteristicas" subtitle="Detalhe os principais atributos fisicos do imovel.">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="quartos">Quartos</label>
              <input id="quartos" type="number" min="0" step="1" {...register('quartos')} />
              {errors.quartos && <span className="error-text">{errors.quartos.message}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="metragem">Metragem</label>
              <input id="metragem" type="number" min="0" step="0.01" {...register('metragem')} />
              {errors.metragem && <span className="error-text">{errors.metragem.message}</span>}
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="vagasGaragem">Vagas de garagem</label>
              <input id="vagasGaragem" type="number" min="0" step="1" {...register('vagasGaragem')} />
              {errors.vagasGaragem && <span className="error-text">{errors.vagasGaragem.message}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="banheiros">Banheiros</label>
              <input id="banheiros" type="number" min="0" step="1" {...register('banheiros')} />
              {errors.banheiros && <span className="error-text">{errors.banheiros.message}</span>}
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="suites">Suites</label>
              <input id="suites" type="number" min="0" step="1" {...register('suites')} />
              {errors.suites && <span className="error-text">{errors.suites.message}</span>}
            </div>
          </div>
        </FormSection>

        <FormSection title="Midia" subtitle="Adicione links externos e organize a galeria do imovel.">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="linkExternoFotos">Link externo de fotos</label>
              <input id="linkExternoFotos" type="url" placeholder="https://..." {...register('linkExternoFotos')} />
              {errors.linkExternoFotos && <span className="error-text">{errors.linkExternoFotos.message}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="linkExternoVideos">Link externo de videos</label>
              <input id="linkExternoVideos" type="url" placeholder="https://..." {...register('linkExternoVideos')} />
              {errors.linkExternoVideos && <span className="error-text">{errors.linkExternoVideos.message}</span>}
            </div>
          </div>

          {isCreateMode && (
            <>
              <div className="form-group">
                <label htmlFor="imagens">Imagens do imovel</label>
                <input
                  id="imagens"
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  multiple
                  onChange={handleImageSelection}
                  disabled={isBusy}
                />
                <small className="hint-text">
                  {selectedImages.length} imagem(ns) selecionada(s). Maximo de {MAX_IMAGES} arquivos, ate {MAX_IMAGE_SIZE_MB}MB cada.
                </small>
                {imageError && <span className="error-text">{imageError}</span>}
              </div>

              {selectedImages.length > 0 && (
                <div className="image-preview-grid">
                  {selectedImages.map((image) => (
                    <figure key={`${image.file.name}-${image.file.lastModified}`} className="image-preview-card">
                      <img src={image.previewUrl} alt={image.file.name} />
                      <figcaption>{image.file.name}</figcaption>
                      <button
                        type="button"
                        className="image-remove-btn"
                        onClick={() => removeImage(image.file.name, image.file.lastModified)}
                        disabled={isBusy}
                      >
                        Remover
                      </button>
                    </figure>
                  ))}
                </div>
              )}

              {isBusy && selectedImages.length > 0 && uploadProgress > 0 && (
                <div className="hint-text">Upload de imagens: {uploadProgress}%</div>
              )}
            </>
          )}
        </FormSection>

        <FormSection title="Observacoes" subtitle="Registre descricao comercial e dados complementares.">
          <div className="form-group">
            <label htmlFor="descricao">Descricao*</label>
            <textarea id="descricao" rows={4} {...register('descricao')} />
            {errors.descricao && <span className="error-text">{errors.descricao.message}</span>}
          </div>

          {isCreateMode && (
            <>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="nomeProprietario">Nome do proprietario</label>
                  <input id="nomeProprietario" type="text" {...register('nomeProprietario')} />
                  {errors.nomeProprietario && <span className="error-text">{errors.nomeProprietario.message}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="telefoneProprietario">Telefone</label>
                  <input
                    id="telefoneProprietario"
                    type="tel"
                    inputMode="tel"
                    placeholder="(11) 99999-9999"
                    {...register('telefoneProprietario', {
                      onChange: (event) => {
                        setValue('telefoneProprietario', formatPhone(event.target.value), {
                          shouldDirty: true,
                        });
                      },
                    })}
                  />
                  {errors.telefoneProprietario && <span className="error-text">{errors.telefoneProprietario.message}</span>}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="enderecoCaptacao">Endereco da captacao</label>
                <textarea id="enderecoCaptacao" rows={3} {...register('enderecoCaptacao')} />
                {errors.enderecoCaptacao && <span className="error-text">{errors.enderecoCaptacao.message}</span>}
              </div>
            </>
          )}
        </FormSection>

        <div className="form-submit-bar">
          <Button type="submit" disabled={isBusy}>
            {isBusy ? 'Salvando...' : isCreateMode ? 'Salvar' : 'Salvar alteracoes'}
          </Button>
        </div>
      </form>

      {isSuccessModalOpen && (
        <Modal
          title={isCreateMode ? 'Imovel cadastrado com sucesso' : 'Imovel atualizado com sucesso'}
          subtitle={successMessage}
          actions={
            <Button type="button" onClick={handleSuccessClose}>
              OK
            </Button>
          }
        >
          <p className="saas-copy">O sistema concluiu o fluxo e ja pode seguir para a proxima etapa.</p>
        </Modal>
      )}
    </main>
  );
}

export function ImovelCreate() {
  return <ImovelFormPage mode="create" />;
}

export function ImovelEdit() {
  return <ImovelFormPage mode="edit" />;
}
