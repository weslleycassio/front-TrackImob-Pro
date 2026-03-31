import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  crmStageTypeOptions,
  type CrmPipelineStage,
  type CrmPipelineStageType,
} from '../../types/crm';
import { getContrastTextColor, normalizeHexColor, sanitizeHexColor, toRgba } from '../../utils/color';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

const stageSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome da coluna'),
  ordem: z.coerce.number().int('Informe uma ordem inteira').min(1, 'A ordem deve ser maior que zero'),
  cor: z.string().trim().regex(HEX_COLOR_PATTERN, 'Informe uma cor hexadecimal valida'),
  tipo: z.enum(['FRIO', 'QUENTE', 'PERDIDO', 'CONCLUIDO_COM_SUCESSO'], {
    required_error: 'Selecione o tipo da coluna',
  }),
  slaHoras: z.preprocess(
    (value) => {
      if (value === '' || value === null || value === undefined) {
        return undefined;
      }

      return Number(value);
    },
    z
      .number({ invalid_type_error: 'Informe um SLA numerico' })
      .min(0, 'O SLA deve ser maior ou igual a zero')
      .optional(),
  ),
  ativa: z.boolean(),
});

type StageFormValues = z.infer<typeof stageSchema>;

type StageFormModalProps = {
  mode: 'create' | 'edit';
  stage?: CrmPipelineStage | null;
  defaultOrder: number;
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (values: StageFormValues) => Promise<void>;
};

export function StageFormModal({ mode, stage, defaultOrder, isSubmitting, error, onClose, onSubmit }: StageFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<StageFormValues>({
    resolver: zodResolver(stageSchema),
    defaultValues: {
      nome: stage?.nome ?? '',
      ordem: defaultOrder,
      cor: stage?.cor ?? '#0078d4',
      tipo: stage?.tipo ?? 'FRIO',
      slaHoras: stage?.slaHoras ?? undefined,
      ativa: stage?.ativa ?? true,
    },
  });

  useEffect(() => {
    reset({
      nome: stage?.nome ?? '',
      ordem: defaultOrder,
      cor: stage?.cor ?? '#0078d4',
      tipo: (stage?.tipo as CrmPipelineStageType | undefined) ?? 'FRIO',
      slaHoras: stage?.slaHoras ?? undefined,
      ativa: stage?.ativa ?? true,
    });
  }, [defaultOrder, reset, stage]);

  const stageName = watch('nome')?.trim() || 'Preview da coluna';
  const typedColor = watch('cor') ?? '#0078d4';
  const currentColor = normalizeHexColor(typedColor, '#0078D4');
  const previewTextColor = getContrastTextColor(currentColor);
  const orderHint =
    mode === 'create'
      ? 'Novas colunas entram no final da sequencia ativa. Depois voce pode reordenar pela lista.'
      : 'A ordem visivel considera apenas as colunas ativas do pipeline.';
  const colorRegister = register('cor', {
    onBlur: (event) => {
      const sanitizedColor = sanitizeHexColor(event.target.value);

      if (!sanitizedColor) {
        return;
      }

      setValue('cor', sanitizedColor, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    },
  });

  return (
    <Modal
      title={mode === 'create' ? 'Nova coluna' : 'Editar coluna'}
      subtitle="Organize nome, ordem, tipo e SLA da etapa do funil."
      onClose={onClose}
      actions={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : mode === 'create' ? 'Criar coluna' : 'Salvar alteracoes'}
          </Button>
        </>
      }
    >
      {error ? <div className="global-error">{error}</div> : null}

      <div className="modal-form-grid">
        <Input id="crm-stage-nome" label="Nome" error={errors.nome?.message} {...register('nome')} />

        <div className="crm-form-grid crm-form-grid--two">
          <Input
            id="crm-stage-ordem"
            label="Ordem"
            type="number"
            min={1}
            readOnly={mode === 'create'}
            hint={orderHint}
            error={errors.ordem?.message}
            {...register('ordem')}
          />
          <Select id="crm-stage-tipo" label="Tipo" error={errors.tipo?.message} {...register('tipo')}>
            {crmStageTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="crm-form-grid crm-form-grid--two">
          <div className="ui-field">
            <label className="ui-label" htmlFor="crm-stage-cor">
              Cor
            </label>
            <div className="crm-color-field">
              <input id="crm-stage-cor" className="ui-control" placeholder="#0078D4" {...colorRegister} />
              <input
                id="crm-stage-cor-picker"
                className="crm-color-field__picker"
                type="color"
                value={currentColor}
                aria-label="Selecionar cor da coluna"
                onChange={(event) => {
                  setValue('cor', event.target.value.toUpperCase(), {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  });
                }}
              />
            </div>
            <div
              className="crm-color-preview"
              style={{
                backgroundColor: toRgba(currentColor, 0.08),
                borderColor: toRgba(currentColor, 0.22),
              }}
            >
              <span className="crm-color-preview__eyebrow">Previa</span>
              <div className="crm-color-preview__content">
                <span
                  className="crm-color-preview__chip"
                  style={{
                    backgroundColor: currentColor,
                    color: previewTextColor,
                    boxShadow: `inset 0 0 0 1px ${toRgba(currentColor, 0.24)}`,
                  }}
                >
                  {stageName}
                </span>
                <strong className="crm-color-preview__code">Cor da coluna</strong>
              </div>
            </div>
            {errors.cor?.message ? <span className="ui-field__error">{errors.cor.message}</span> : null}
            {!errors.cor?.message ? (
              <span className="ui-field__hint">Escolha a cor que vai identificar esta coluna no funil.</span>
            ) : null}
          </div>

          <Input
            id="crm-stage-sla"
            label="SLA em horas"
            type="number"
            min={0}
            error={errors.slaHoras?.message}
            {...register('slaHoras')}
          />
        </div>

        <label className="crm-checkbox-row" htmlFor="crm-stage-ativa">
          <input id="crm-stage-ativa" type="checkbox" {...register('ativa')} />
          <span>
            <strong>Coluna ativa</strong>
            <small>Stages inativas continuam no cadastro, mas ficam identificadas como fora de operacao.</small>
          </span>
        </label>
      </div>
    </Modal>
  );
}
