import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { toFriendlyError } from '../../utils/errorMessages';
import { createImovel, extractImovelId, uploadImovelImages } from '../../services/imoveis';

const imovelSchema = z.object({
  titulo: z.string().min(1, 'Título é obrigatório'),
  tipo: z.string().min(1, 'Tipo é obrigatório'),
  finalidade: z.enum(['Venda', 'Aluguel'], {
    required_error: 'Finalidade é obrigatória',
  }),
  bairro: z.string().optional(),
  cidade: z.string().min(1, 'Cidade é obrigatória'),
  preco: z.coerce
    .number({ invalid_type_error: 'Preço deve ser um número válido' })
    .positive('Preço deve ser maior que zero'),
  descricao: z.string().optional(),
  status: z.enum(['ATIVO', 'INATIVO'], {
    required_error: 'Status é obrigatório',
  }),
});

type ImovelFormData = z.infer<typeof imovelSchema>;

type PreviewFile = {
  file: File;
  previewUrl: string;
};

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function ImovelCreate() {
  const navigate = useNavigate();
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<PreviewFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ImovelFormData>({
    resolver: zodResolver(imovelSchema),
    defaultValues: {
      finalidade: 'Venda',
      status: 'ATIVO',
    },
  });

  const watchedPreco = watch('preco');
  const precoFormatado = useMemo(() => {
    if (typeof watchedPreco !== 'number' || Number.isNaN(watchedPreco)) return 'R$ 0,00';
    return currencyFormatter.format(watchedPreco);
  }, [watchedPreco]);

  const handleImageSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);

    setSelectedImages((previous) => {
      previous.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      return files.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      }));
    });
  };

  const clearForm = () => {
    selectedImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    setSelectedImages([]);
    setUploadProgress(0);
    reset({
      titulo: '',
      tipo: '',
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
    setSuccessMessage(null);

    try {
      const createdImovel = await createImovel({
        titulo: data.titulo,
        tipo: data.tipo,
        finalidade: data.finalidade,
        bairro: data.bairro,
        cidade: data.cidade,
        preco: data.preco,
        descricao: data.descricao,
        status: data.status,
      });

      const createdImovelId = extractImovelId(createdImovel);

      if (!createdImovelId) {
        setGlobalError('Imóvel criado, mas o retorno da API não trouxe o ID para upload de imagens.');
        return;
      }

      if (selectedImages.length > 0) {
        await uploadImovelImages(
          createdImovelId,
          selectedImages.map((image) => image.file),
          setUploadProgress,
        );
      }

      setSuccessMessage('Imóvel cadastrado com sucesso!');
      clearForm();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Erro ao cadastrar imóvel', error);
      setGlobalError(toFriendlyError(error, 'Não foi possível cadastrar o imóvel. Tente novamente.'));
    }
  };

  return (
    <main className="content-page">
      <section className="feature-card form-card">
        <div className="row page-header-row">
          <h1>Cadastrar Imóveis</h1>
          <button className="secondary" type="button" onClick={() => navigate('/dashboard')}>
            Voltar
          </button>
        </div>

        {globalError && <div className="global-error">{globalError}</div>}
        {successMessage && <div className="info-text">{successMessage}</div>}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="form-group">
            <label htmlFor="titulo">Título*</label>
            <input id="titulo" type="text" {...register('titulo')} />
            {errors.titulo && <span className="error-text">{errors.titulo.message}</span>}
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="tipo">Tipo*</label>
              <input id="tipo" type="text" {...register('tipo')} />
              {errors.tipo && <span className="error-text">{errors.tipo.message}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="finalidade">Finalidade*</label>
              <select id="finalidade" {...register('finalidade')}>
                <option value="Venda">Venda</option>
                <option value="Aluguel">Aluguel</option>
              </select>
              {errors.finalidade && <span className="error-text">{errors.finalidade.message}</span>}
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="bairro">Bairro</label>
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
              <input id="preco" type="number" min="0" step="0.01" {...register('preco')} />
              <small className="hint-text">Formatado: {precoFormatado}</small>
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
            <label htmlFor="descricao">Descrição</label>
            <textarea id="descricao" rows={4} {...register('descricao')} />
            {errors.descricao && <span className="error-text">{errors.descricao.message}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="imagens">Imagens</label>
            <input id="imagens" type="file" accept="image/*" multiple onChange={handleImageSelection} />
            <small className="hint-text">Você pode selecionar múltiplas imagens.</small>
          </div>

          {selectedImages.length > 0 && (
            <div className="image-preview-grid">
              {selectedImages.map((image) => (
                <figure key={`${image.file.name}-${image.file.lastModified}`} className="image-preview-card">
                  <img src={image.previewUrl} alt={image.file.name} />
                  <figcaption>{image.file.name}</figcaption>
                </figure>
              ))}
            </div>
          )}

          {isSubmitting && selectedImages.length > 0 && (
            <div className="hint-text">Upload de imagens: {uploadProgress}%</div>
          )}

          <button className="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
      </section>
    </main>
  );
}
