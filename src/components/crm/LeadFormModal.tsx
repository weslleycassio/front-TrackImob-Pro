import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { EntityId } from '../../api/types';
import type { CrmAssignableUser, CrmPipeline, CrmPipelineDetails, CrmPipelineStage } from '../../types/crm';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';
import { onlyDigits } from './leads/leadUtils';

const requiredLabel = (text: string) => (
  <>
    {text} <span className="ui-label__required">*</span>
  </>
);

function parseOptionalNumber(value?: string) {
  if (!value || value.trim().length === 0) {
    return null;
  }

  const normalized = value.trim().replace(/\s+/g, '').replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

const optionalMoneyField = z
  .string()
  .optional()
  .refine((value) => value === undefined || value.trim().length === 0 || parseOptionalNumber(value) !== null, 'Informe um valor numerico valido');

const leadSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome do lead'),
  telefone: z
    .string()
    .trim()
    .min(1, 'Informe o telefone do lead')
    .refine((value) => onlyDigits(value).length >= 10, 'Informe um telefone valido'),
  email: z.union([z.literal(''), z.string().trim().email('Informe um e-mail valido')]).optional(),
  origem: z.string().trim().min(1, 'Informe a origem do lead'),
  informacoesAdicionais: z.string().trim().max(2000, 'Use no maximo 2000 caracteres').optional(),
  pipelineId: z.string().min(1, 'Pipeline indisponivel para cadastrar o lead'),
  stageId: z.string().min(1, 'Etapa inicial indisponivel para cadastrar o lead'),
  responsavelId: z.string().optional(),
  coResponsaveis: z.array(z.string()),
  entrada: optionalMoneyField,
  fgts: optionalMoneyField,
  renda: optionalMoneyField,
  dataNascimento: z.string().optional(),
});

export type LeadFormValues = z.infer<typeof leadSchema>;

type LeadFormModalProps = {
  pipeline: CrmPipeline | CrmPipelineDetails | null;
  stage: CrmPipelineStage | null;
  users: CrmAssignableUser[];
  currentUserId: EntityId | null;
  canSelectResponsavel: boolean;
  usersLoading: boolean;
  usersError: string | null;
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (values: LeadFormValues) => Promise<void>;
};

function formatPhone(value: string) {
  const numbers = onlyDigits(value).slice(0, 11);

  if (numbers.length <= 2) {
    return numbers;
  }

  if (numbers.length <= 10) {
    return numbers.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2').slice(0, 14);
  }

  return numbers.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 15);
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export function LeadFormModal({
  pipeline,
  stage,
  users,
  currentUserId,
  canSelectResponsavel,
  usersLoading,
  usersError,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: LeadFormModalProps) {
  const enabledUsers = useMemo(() => users.filter((user) => user.ativo !== false), [users]);
  const hasContext = Boolean(pipeline && stage);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      nome: '',
      telefone: '',
      email: '',
      origem: '',
      informacoesAdicionais: '',
      pipelineId: pipeline ? String(pipeline.id) : '',
      stageId: stage ? String(stage.id) : '',
      responsavelId: '',
      coResponsaveis: [],
      entrada: '',
      fgts: '',
      renda: '',
      dataNascimento: '',
    },
  });

  useEffect(() => {
    register('telefone');
    register('pipelineId');
    register('stageId');
    register('responsavelId');
    register('coResponsaveis');
  }, [register]);

  useEffect(() => {
    reset({
      nome: '',
      telefone: '',
      email: '',
      origem: '',
      informacoesAdicionais: '',
      pipelineId: pipeline ? String(pipeline.id) : '',
      stageId: stage ? String(stage.id) : '',
      responsavelId: '',
      coResponsaveis: [],
      entrada: '',
      fgts: '',
      renda: '',
      dataNascimento: '',
    });
  }, [pipeline, reset, stage]);

  const selectedResponsavelId = watch('responsavelId') ?? '';
  const selectedCoResponsaveis = watch('coResponsaveis');
  const coResponsaveisOptions = useMemo(
    () =>
      enabledUsers.filter(
        (user) =>
          String(user.id) !== String(currentUserId ?? '') && String(user.id) !== String(selectedResponsavelId || ''),
      ),
    [currentUserId, enabledUsers, selectedResponsavelId],
  );

  useEffect(() => {
    if (!selectedResponsavelId) {
      return;
    }

    if (!selectedCoResponsaveis.includes(selectedResponsavelId)) {
      return;
    }

    setValue(
      'coResponsaveis',
      selectedCoResponsaveis.filter((value) => value !== selectedResponsavelId),
      {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      },
    );
  }, [selectedCoResponsaveis, selectedResponsavelId, setValue]);

  const toggleUser = (userId: string) => {
    const currentValues = selectedCoResponsaveis;
    const nextValues = currentValues.includes(userId)
      ? currentValues.filter((value) => value !== userId)
      : [...currentValues, userId];

    setValue('coResponsaveis', nextValues, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  return (
    <Modal
      title="Novo lead"
      subtitle="Cadastre rapidamente a oportunidade e deixe o restante opcional para completar depois."
      onClose={onClose}
      actions={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting || !hasContext}>
            {isSubmitting ? 'Salvando...' : 'Criar lead'}
          </Button>
        </>
      }
    >
      {error ? <div className="global-error">{error}</div> : null}

      <div className="modal-form-grid crm-form-grid">
        <section className="crm-lead-form-context">
          <div>
            <strong>Pipeline ativo</strong>
            <span>{pipeline?.nome ?? 'Nao disponivel'}</span>
          </div>
          <div>
            <strong>Entrada inicial</strong>
            <span>{stage?.nome ?? 'Configure um stage ativo para cadastrar leads'}</span>
          </div>
        </section>

        <div className="crm-inline-tip">
          Se nenhum responsavel for informado, o criador do lead sera definido automaticamente como responsavel.
        </div>

        {canSelectResponsavel ? (
          <section className="crm-assignee-panel">
            <div className="crm-assignee-panel__header">
              <div>
                <h3>Responsavel</h3>
                <p>Opcional. Se nao for informado, o criador do lead sera definido automaticamente como responsavel.</p>
              </div>
            </div>

            <Select
              id="crm-lead-responsavel"
              label="Responsavel do lead"
              value={selectedResponsavelId}
              error={errors.responsavelId?.message}
              hint={usersLoading ? 'Carregando usuarios da imobiliaria...' : usersError ?? undefined}
              onChange={(event) =>
                setValue('responsavelId', event.target.value, {
                  shouldDirty: true,
                  shouldTouch: true,
                  shouldValidate: true,
                })
              }
              disabled={usersLoading || enabledUsers.length === 0}
            >
              <option value="">Deixar automatico</option>
              {enabledUsers.map((user) => (
                <option key={`responsavel-option-${user.id}`} value={String(user.id)}>
                  {user.nome} {user.role === 'ADMIN' ? '- Administrador' : '- Corretor'}
                </option>
              ))}
            </Select>

            {!usersLoading && !usersError && enabledUsers.length === 0 ? (
              <div className="crm-assignee-panel__empty">Nenhum usuario disponivel para assumir o lead manualmente.</div>
            ) : null}
          </section>
        ) : null}

        <div className="crm-form-grid crm-form-grid--two">
          <Input id="crm-lead-nome" label={requiredLabel('Nome')} error={errors.nome?.message} {...register('nome')} />
          <Input
            id="crm-lead-telefone"
            label={requiredLabel('Telefone')}
            placeholder="(11) 99999-9999"
            maxLength={15}
            name="telefone"
            error={errors.telefone?.message}
            value={watch('telefone') ?? ''}
            onChange={(event) =>
              setValue('telefone', formatPhone(event.target.value), {
                shouldDirty: true,
                shouldTouch: true,
                shouldValidate: true,
              })
            }
          />
        </div>

        <div className="crm-form-grid crm-form-grid--two">
          <Input id="crm-lead-email" label="E-mail" error={errors.email?.message} {...register('email')} />
          <Input
            id="crm-lead-origem"
            label={requiredLabel('Origem')}
            error={errors.origem?.message}
            placeholder="Instagram, site, indicacao..."
            {...register('origem')}
          />
        </div>

        <div className="ui-field">
          <label className="ui-label" htmlFor="crm-lead-informacoes-adicionais">
            Informacoes adicionais
          </label>
          <textarea
            id="crm-lead-informacoes-adicionais"
            rows={4}
            maxLength={2000}
            placeholder="Ex.: perfil do cliente, momento da compra, restricoes, interesse principal..."
            {...register('informacoesAdicionais')}
          />
          {errors.informacoesAdicionais?.message ? (
            <span className="ui-field__error">{errors.informacoesAdicionais.message}</span>
          ) : (
            <span className="ui-field__hint">Opcional. Use para guardar contexto comercial importante.</span>
          )}
        </div>

        <section className="crm-assignee-panel">
          <div className="crm-assignee-panel__header">
            <div>
              <h3>Co-responsaveis</h3>
              <p>Disponivel para administrador e corretor. Selecione quem tambem pode acompanhar esse lead.</p>
            </div>
          </div>
          {usersLoading ? <div className="crm-assignee-panel__empty">Carregando usuarios da imobiliaria...</div> : null}
          {!usersLoading && usersError ? <div className="crm-assignee-panel__empty">{usersError}</div> : null}
          {!usersLoading && !usersError && coResponsaveisOptions.length === 0 ? (
            <div className="crm-assignee-panel__empty">Nenhum outro usuario disponivel para co-responsabilidade.</div>
          ) : null}
          {!usersLoading && !usersError && coResponsaveisOptions.length > 0 ? (
            <div className="crm-assignee-grid">
              {coResponsaveisOptions.map((user) => {
                const userId = String(user.id);
                const isSelected = selectedCoResponsaveis.includes(userId);

                return (
                  <button
                    key={`coresponsavel-${user.id}`}
                    type="button"
                    className={['crm-user-chip', isSelected ? 'crm-user-chip--selected' : ''].filter(Boolean).join(' ')}
                    onClick={() => toggleUser(userId)}
                  >
                    <span className="crm-user-chip__avatar" aria-hidden="true">
                      {getInitials(user.nome)}
                    </span>
                    <span className="crm-user-chip__copy">
                      <strong>{user.nome}</strong>
                      <small>{user.role === 'ADMIN' ? 'Administrador' : 'Corretor'}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </section>

        <section className="crm-financial-panel">
          <div className="crm-assignee-panel__header">
            <div>
              <h3>Financeiro</h3>
              <p>Todos os campos sao opcionais, mas ajudam a qualificar o lead ja na entrada.</p>
            </div>
          </div>

          <div className="crm-form-grid crm-form-grid--two">
            <Input id="crm-lead-entrada" label="Entrada" placeholder="15000" error={errors.entrada?.message} {...register('entrada')} />
            <Input id="crm-lead-fgts" label="FGTS" placeholder="10000" error={errors.fgts?.message} {...register('fgts')} />
          </div>

          <div className="crm-form-grid crm-form-grid--two">
            <Input id="crm-lead-renda" label="Renda" placeholder="8500" error={errors.renda?.message} {...register('renda')} />
            <Input
              id="crm-lead-data-nascimento"
              label="Data de nascimento"
              type="date"
              error={errors.dataNascimento?.message}
              {...register('dataNascimento')}
            />
          </div>
        </section>

        {!hasContext ? (
          <div className="crm-inline-warning">
            Ative um pipeline com pelo menos uma etapa para liberar o cadastro rapido de leads.
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
