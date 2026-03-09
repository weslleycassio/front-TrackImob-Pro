import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { createImovel, extractImovelId, uploadImovelImages } from '../../services/imoveis';
import { toFriendlyError } from '../../utils/errorMessages';

const tiposDeImovel = ['Apartamento', 'Casa', 'Sobrado', 'Terreno', 'Comercial', 'Outro'] as const;

const imovelSchema = z.object({
  titulo: z.string().trim().min(1, 'Título é obrigatório'),
  tipo: z.enum(tiposDeImovel, { required_error: 'Tipo é obrigatório' }),
  finalidade: z.enum(['Venda', 'Locação'], {
    required_error: 'Finalidade é obrigatória',
  }),
  bairro: z.string().trim().min(1, 'Bairro é obrigatório'),
  cidade: z.string().trim().min(1, 'Cidade é obrigatória'),
  preco: z.number({ invalid_type_error: 'Preço deve ser um valor válido' }).positive('Preço deve ser maior que zero'),
  descricao: z.string().trim().min(1, 'Descrição é obrigatória'),
  status: z.enum(['ATIVO', 'INATIVO'], {
    required_error: 'Status é obrigatório',
  }),
});

type ImovelFormData = z.infer<typeof imovelSchema>;

type PreviewFile = {
  file: File;
  previewUrl: string;
};

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

export function ImovelCreate() {
  const navigate = useNavigate();
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<PreviewFile[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [precoInput, setPrecoInput] = useState('R$ 0,00');
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('Imóvel cadastrado com sucesso.');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ImovelFormData>({
    resolver: zodResolver(imovelSchema),
    defaultValues: {
      finalidade: 'Venda',
      status: 'ATIVO',
      preco: 0,
      tipo: 'Apartamento',
    },
  });

  const isBusy = useMemo(() => isSubmitting || uploadProgress > 0, [isSubmitting, uploadProgress]);

  useEffect(
    () => () => {
      selectedImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    },
    [selectedImages],
  );

  useEffect(() => {
    if (!isSuccessModalOpen) return;

    const timeout = window.setTimeout(() => {
      navigate('/imoveis', { replace: true });
    }, 1500);

    return () => window.clearTimeout(timeout);
  }, [isSuccessModalOpen, navigate]);

  const handleImageSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';

    if (!files.length) {
      return;
    }

    const invalidTypeFiles = files.filter((file) => !ACCEPTED_IMAGE_TYPES.includes(file.type));
    if (invalidTypeFiles.length > 0) {
      setImageError('Formato inválido. Envie apenas arquivos JPG, JPEG, PNG ou WEBP.');
      return;
    }

    const maxImageSizeBytes = MAX_IMAGE_SIZE_MB * 1024 * 1024;
    const invalidSizeFiles = files.filter((file) => file.size > maxImageSizeBytes);
    if (invalidSizeFiles.length > 0) {
      setImageError(`Cada imagem deve ter no máximo ${MAX_IMAGE_SIZE_MB}MB.`);
      return;
    }

    setSelectedImages((previous) => {
      const existingKeys = new Set(previous.map((image) => `${image.file.name}-${image.file.lastModified}-${image.file.size}`));
      const newFiles = files.filter((file) => !existingKeys.has(`${file.name}-${file.lastModified}-${file.size}`));

      const availableSlots = Math.max(0, MAX_IMAGES - previous.length);
      const filesToAdd = newFiles.slice(0, availableSlots);

      if (filesToAdd.length < newFiles.length) {
        setImageError(`Limite máximo de ${MAX_IMAGES} imagens atingido.`);
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
    reset({
      titulo: '',
      tipo: 'Apartamento',
      finalidade: 'Venda',
      bairro: '',
      cidade: '',
      preco: 0,
      descricao: '',
      status: 'ATIVO',
    });
  };

  const onSubmit = async (data: ImovelFormData) => {
    setGlobalError(null);
    setImageError(null);

    try {
      const precoNumber = parseCurrencyToNumber(precoInput);

      const payload = {
        titulo: data.titulo,
        tipo: data.tipo,
        finalidade: data.finalidade,
        bairro: data.bairro,
        cidade: data.cidade,
        preco: precoNumber,
        descricao: data.descricao,
        status: data.status,
      };

      const createdImovel = await createImovel(payload);
      const imovelId = extractImovelId(createdImovel);

      if (selectedImages.length > 0) {
        if (!imovelId) {
          throw new Error('Não foi possível identificar o imóvel criado para realizar upload das imagens.');
        }

        const selectedImageFiles = selectedImages.map((image) => image.file);
        setUploadProgress(1);

        await uploadImovelImages(imovelId, selectedImageFiles, (progress) => setUploadProgress(progress));
      }

      setUploadProgress(100);
      setSuccessMessage(
        selectedImages.length > 0
          ? 'Imóvel e imagens cadastrados com sucesso.'
          : 'Imóvel cadastrado com sucesso. Você pode adicionar imagens depois.',
      );

      clearForm();
      setIsSuccessModalOpen(true);
    } catch (error) {
      setGlobalError(toFriendlyError(error, 'Não foi possível cadastrar o imóvel. Verifique os dados e tente novamente.'));
    }
  };

  const handlePrecoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { formatted, numeric } = formatCurrencyFromDigits(event.target.value);
    setPrecoInput(formatted);
    setValue('preco', numeric, { shouldValidate: true, shouldDirty: true });
  };

  const handleSuccessClose = () => {
    setIsSuccessModalOpen(false);
    navigate('/imoveis', { replace: true });
  };

  return (
    <main className="content-page">
      <section className="feature-card form-card imovel-form-card">
        <div className="row page-header-row">
          <h1>Cadastrar Imóvel</h1>
          <button className="secondary" type="button" onClick={() => navigate('/app')}>
            Voltar
          </button>
        </div>

        {globalError && <div className="global-error">{globalError}</div>}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="form-group">
            <label htmlFor="titulo">Título*</label>
            <input id="titulo" type="text" placeholder="Ex: Apartamento 2 dormitórios com sacada" {...register('titulo')} />
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
                <option value="Locação">Locação</option>
              </select>
              {errors.finalidade && <span className="error-text">{errors.finalidade.message}</span>}
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="bairro">Bairro*</label>
              <input id="bairro" type="text" {...register('bairro')} />
              {errors.bairro && <span className="error-text">{errors.bairro.message}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="cidade">Cidade*</label>
              <input id="cidade" type="text" {...register('cidade')} />
              {errors.cidade && <span className="error-text">{errors.cidade.message}</span>}
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="preco">Preço*</label>
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

            <div className="form-group">
              <label htmlFor="status">Status*</label>
              <select id="status" {...register('status')}>
                <option value="ATIVO">ATIVO</option>
                <option value="INATIVO">INATIVO</option>
              </select>
              {errors.status && <span className="error-text">{errors.status.message}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="descricao">Descrição*</label>
            <textarea id="descricao" rows={4} {...register('descricao')} />
            {errors.descricao && <span className="error-text">{errors.descricao.message}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="imagens">Imagens do imóvel</label>
            <input
              id="imagens"
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              multiple
              onChange={handleImageSelection}
              disabled={isBusy}
            />
            <small className="hint-text">
              {selectedImages.length} imagem(ns) selecionada(s). Máximo de {MAX_IMAGES} arquivos, até {MAX_IMAGE_SIZE_MB}MB cada.
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

          <button className="primary" type="submit" disabled={isBusy}>
            {isBusy ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
      </section>

      {isSuccessModalOpen && (
        <div className="modal-backdrop" role="presentation">
          <div className="success-modal" role="dialog" aria-modal="true" aria-labelledby="success-title">
            <h2 id="success-title">Imóvel cadastrado com sucesso</h2>
            <p>{successMessage}</p>
            <button className="primary" type="button" onClick={handleSuccessClose}>
              OK
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
