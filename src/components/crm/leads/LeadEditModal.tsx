import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { CrmAssignableUser, CrmLead, CrmPipelineStage } from '../../../types/crm';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Modal } from '../../ui/Modal';
import { Select } from '../../ui/Select';
import { onlyDigits } from './leadUtils';

const optionalMoneyField = z
  .string()
  .optional()
  .refine((value) => value === undefined || value.trim().length === 0 || parseOptionalNumber(value) !== null, 'Informe um valor numerico valido');

const leadEditSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome do lead'),
  telefone: z
    .string()
    .trim()
    .min(1, 'Informe o telefone do lead')
    .refine((value) => onlyDigits(value).length >= 10, 'Informe um telefone valido'),
  email: z.union([z.literal(''), z.string().trim().email('Informe um e-mail valido')]).optional(),
  origem: z.string().trim().min(1, 'Informe a origem do lead'),
  stageId: z.string().min(1, 'Selecione uma etapa valida do funil'),
  entrada: optionalMoneyField,
  fgts: optionalMoneyField,
  renda: optionalMoneyField,
  dataNascimento: z.string().optional(),
  responsavelId: z.string().optional(),
  coResponsaveis: z.array(z.string()),
});

export type LeadEditFormValues = z.infer<typeof leadEditSchema>;

export type LeadEditSubmitValues = {
  values: LeadEditFormValues;
  assignmentsChanged: boolean;
};

type LeadEditModalProps = {
  lead: CrmLead;
  users: CrmAssignableUser[];
  stages: CrmPipelineStage[];
  stagesLoading: boolean;
  stagesError: string | null;
  currentUserId: string;
  isAdmin: boolean;
  usersLoading: boolean;
  usersError: string | null;
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: LeadEditSubmitValues) => Promise<void>;
};

function parseOptionalNumber(value?: string) {
  if (!value || value.trim().length === 0) {
    return null;
  }

  const normalized = value.trim().replace(/\s+/g, '').replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

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

function toNumberInputValue(value: number | null) {
  return value === null || !Number.isFinite(value) ? '' : String(value);
}

function arraysEqual(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }

  return [...left].sort().every((value, index) => value === [...right].sort()[index]);
}

function getInitialValues(lead: CrmLead): LeadEditFormValues {
  return {
    nome: lead.nome,
    telefone: formatPhone(lead.telefone ?? ''),
    email: lead.email ?? '',
    origem: lead.origem ?? '',
    stageId: String(lead.stageId),
    entrada: toNumberInputValue(lead.entrada),
    fgts: toNumberInputValue(lead.fgts),
    renda: toNumberInputValue(lead.renda),
    dataNascimento: lead.dataNascimento ?? '',
    responsavelId: lead.responsaveis[0] ? String(lead.responsaveis[0].id) : '',
    coResponsaveis: lead.coResponsaveis.map((user) => String(user.id)),
  };
}

function formatAssignmentNames(names: string[]) {
  if (names.length === 0) {
    return 'Nenhum informado';
  }

  return names.join(', ');
}

export function LeadEditModal({
  lead,
  users,
  stages,
  stagesLoading,
  stagesError,
  currentUserId,
  isAdmin,
  usersLoading,
  usersError,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: LeadEditModalProps) {
  const enabledUsers = useMemo(() => users.filter((user) => user.ativo !== false), [users]);
  const initialValues = useMemo(() => getInitialValues(lead), [lead]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LeadEditFormValues>({
    resolver: zodResolver(leadEditSchema),
    defaultValues: initialValues,
  });

  useEffect(() => {
    register('telefone');
    register('stageId');
    register('responsavelId');
    register('coResponsaveis');
  }, [register]);

  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  const selectedResponsavelId = watch('responsavelId') ?? '';
  const selectedStageId = watch('stageId') ?? '';
  const selectedCoResponsaveis = watch('coResponsaveis');
  const availableStages = useMemo(() => {
    if (stages.length > 0) {
      return stages;
    }

    return lead.stage
      ? [
          {
            id: lead.stage.id,
            pipelineId: lead.stage.pipelineId,
            nome: lead.stage.nome,
            ordem: lead.stage.ordem,
            cor: lead.stage.cor,
            tipo: lead.stage.tipo,
            ativa: lead.stage.ativa,
            slaHoras: null,
          },
        ]
      : [];
  }, [lead.stage, stages]);
  const coResponsaveisOptions = useMemo(
    () =>
      enabledUsers.filter(
        (user) =>
          String(user.id) !== String(currentUserId) && String(user.id) !== String(selectedResponsavelId || ''),
      ),
    [currentUserId, enabledUsers, selectedResponsavelId],
  );

  useEffect(() => {
    if (!selectedResponsavelId || !selectedCoResponsaveis.includes(selectedResponsavelId)) {
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

  const handleToggleCoResponsavel = (userId: string) => {
    const nextValues = selectedCoResponsaveis.includes(userId)
      ? selectedCoResponsaveis.filter((value) => value !== userId)
      : [...selectedCoResponsaveis, userId];

    setValue('coResponsaveis', nextValues, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const submitForm = handleSubmit(async (values) => {
    const assignmentsChanged = isAdmin
      ? values.responsavelId !== initialValues.responsavelId || !arraysEqual(values.coResponsaveis, initialValues.coResponsaveis)
      : false;

    await onSubmit({
      values,
      assignmentsChanged,
    });
  });

  const currentResponsavelNames = lead.responsaveis.map((user) => user.nome);
  const currentCoResponsavelNames = lead.coResponsaveis.map((user) => user.nome);

  return (
    <Modal
      title="Editar lead"
      subtitle="Atualize os dados comerciais e financeiros deste lead."
      onClose={onClose}
      actions={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={submitForm} disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Salvar alteracoes'}
          </Button>
        </>
      }
    >
      {error ? <div className="global-error">{error}</div> : null}

      <div className="modal-form-grid crm-form-grid">
        <section className="crm-financial-panel">
          <div className="crm-assignee-panel__header">
            <div>
              <h3>Dados basicos</h3>
              <p>Mantenha as informacoes principais do lead atualizadas para a operacao comercial.</p>
            </div>
          </div>

          <div className="crm-form-grid crm-form-grid--two">
            <Input id="crm-edit-lead-nome" label="Nome" error={errors.nome?.message} {...register('nome')} />
            <Input
              id="crm-edit-lead-telefone"
              label="Telefone"
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
            <Input id="crm-edit-lead-email" label="E-mail" error={errors.email?.message} {...register('email')} />
            <Input id="crm-edit-lead-origem" label="Origem" error={errors.origem?.message} {...register('origem')} />
          </div>

          <div className="crm-form-grid">
            <Select
              id="crm-edit-lead-stage"
              label="Etapa do funil"
              value={selectedStageId}
              error={errors.stageId?.message}
              hint={
                stagesLoading
                  ? 'Carregando etapas do pipeline...'
                  : stagesError ??
                    'Alterar esta etapa movera o lead para outra coluna no CRM.'
              }
              onChange={(event) =>
                setValue('stageId', event.target.value, {
                  shouldDirty: true,
                  shouldTouch: true,
                  shouldValidate: true,
                })
              }
              disabled={stagesLoading || availableStages.length === 0}
            >
              {availableStages.map((stage) => (
                <option key={`edit-stage-${stage.id}`} value={String(stage.id)}>
                  {stage.nome}
                </option>
              ))}
            </Select>
          </div>
        </section>

        <section className="crm-financial-panel">
          <div className="crm-assignee-panel__header">
            <div>
              <h3>Dados financeiros</h3>
              <p>Esses dados continuam opcionais, mas ajudam a qualificar melhor o lead.</p>
            </div>
          </div>

          <div className="crm-form-grid crm-form-grid--two">
            <Input id="crm-edit-lead-entrada" label="Entrada" error={errors.entrada?.message} {...register('entrada')} />
            <Input id="crm-edit-lead-fgts" label="FGTS" error={errors.fgts?.message} {...register('fgts')} />
          </div>

          <div className="crm-form-grid crm-form-grid--two">
            <Input id="crm-edit-lead-renda" label="Renda" error={errors.renda?.message} {...register('renda')} />
            <Input
              id="crm-edit-lead-data-nascimento"
              label="Data de nascimento"
              type="date"
              error={errors.dataNascimento?.message}
              {...register('dataNascimento')}
            />
          </div>
        </section>

        <section className="crm-assignee-panel">
          <div className="crm-assignee-panel__header">
            <div>
              <h3>Responsaveis</h3>
              <p>{isAdmin ? 'Como administrador, voce pode redistribuir a responsabilidade deste lead.' : 'Somente leitura para usuarios nao administradores.'}</p>
            </div>
          </div>

          {isAdmin ? (
            <div className="crm-form-grid">
              <Select
                id="crm-edit-lead-responsavel"
                label="Responsavel"
                value={selectedResponsavelId}
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
                {enabledUsers.map((user) => (
                  <option key={`edit-responsavel-${user.id}`} value={String(user.id)}>
                    {user.nome} {user.role === 'ADMIN' ? '- Administrador' : '- Corretor'}
                  </option>
                ))}
              </Select>

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
                        key={`edit-coresponsavel-${user.id}`}
                        type="button"
                        className={['crm-user-chip', isSelected ? 'crm-user-chip--selected' : ''].filter(Boolean).join(' ')}
                        onClick={() => handleToggleCoResponsavel(userId)}
                      >
                        <span className="crm-user-chip__avatar" aria-hidden="true">
                          {user.nome
                            .trim()
                            .split(/\s+/)
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((part) => part.charAt(0).toUpperCase())
                            .join('')}
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
            </div>
          ) : (
            <div className="crm-readonly-list">
              <div className="crm-readonly-list__item">
                <strong>Responsavel atual</strong>
                <span>{formatAssignmentNames(currentResponsavelNames)}</span>
              </div>
              <div className="crm-readonly-list__item">
                <strong>Co-responsaveis atuais</strong>
                <span>{formatAssignmentNames(currentCoResponsavelNames)}</span>
              </div>
            </div>
          )}
        </section>
      </div>
    </Modal>
  );
}
