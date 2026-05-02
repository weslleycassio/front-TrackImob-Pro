import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { CrmPipeline } from '../../types/crm';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';

const pipelineSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome do pipeline'),
  ativo: z.boolean(),
});

type PipelineFormValues = z.infer<typeof pipelineSchema>;

type PipelineFormModalProps = {
  mode: 'create' | 'edit';
  pipeline?: CrmPipeline | null;
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (values: PipelineFormValues) => Promise<void>;
};

export function PipelineFormModal({ mode, pipeline, isSubmitting, error, onClose, onSubmit }: PipelineFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<PipelineFormValues>({
    resolver: zodResolver(pipelineSchema),
    defaultValues: {
      nome: pipeline?.nome ?? '',
      ativo: true,
    },
  });

  useEffect(() => {
    reset({
      nome: pipeline?.nome ?? '',
      ativo: true,
    });
    setValue('ativo', true);
  }, [pipeline, reset, setValue]);

  return (
    <Modal
      title={mode === 'create' ? 'Criar pipeline' : 'Editar pipeline'}
      subtitle="Defina o nome do funil comercial principal da imobiliaria."
      onClose={onClose}
      actions={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit((values) => onSubmit({ ...values, ativo: true }))} disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : mode === 'create' ? 'Criar pipeline' : 'Salvar alteracoes'}
          </Button>
        </>
      }
    >
      {error ? <div className="global-error">{error}</div> : null}

      <div className="modal-form-grid">
        <Input id="crm-pipeline-nome" label="Nome" error={errors.nome?.message} {...register('nome')} />
        <input type="hidden" {...register('ativo')} />

        <div className="crm-inline-warning">Este pipeline representa o funil principal do CRM da imobiliaria nesta fase do produto.</div>
      </div>
    </Modal>
  );
}
