import { zodResolver } from '@hookform/resolvers/zod';
import { MessageCircle, Power, RefreshCw, Save, Send, Smartphone } from 'lucide-react';
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { AdminImobiliaria, EntityId } from '../../api/types';
import { WhatsAppQRCodeCard } from '../../components/whatsapp/WhatsAppQRCodeCard';
import { WhatsAppStatusBadge } from '../../components/whatsapp/WhatsAppStatusBadge';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Select';
import { Skeleton } from '../../components/ui/Skeleton';
import { Table, TableContainer } from '../../components/ui/Table';
import { Toast } from '../../components/ui/Toast';
import {
  createAdminWhatsAppInstance,
  getAdminWhatsAppGroups,
  getAdminWhatsAppLogs,
  getAdminWhatsAppQrCode,
  getAdminWhatsAppStatus,
  getRealEstateWhatsAppConfig,
  logoutAdminWhatsApp,
  restartAdminWhatsApp,
  saveRealEstateWhatsAppConfig,
  sendRealEstateWhatsAppGroupTest,
} from '../../services/adminWhatsapp.service';
import {
  createAdminImobiliaria,
  getAdminImobiliarias,
  inativarAdminImobiliaria,
  reativarAdminImobiliaria,
  updateAdminImobiliariaConfig,
} from '../../services/adminImobiliarias.service';
import type { RealEstateWhatsAppConfig, WhatsAppConnection, WhatsAppGroup, WhatsAppMessageLog } from '../../types/whatsapp';
import { toFriendlyError } from '../../utils/errorMessages';

type FeedbackToastState = {
  title: string;
  description?: string;
  variant: 'success' | 'error' | 'info';
};

type StatusActionState = {
  imobiliaria: AdminImobiliaria;
  action: 'inativar' | 'reativar';
};

type WhatsAppConfigModalState = {
  imobiliaria: AdminImobiliaria;
  config: RealEstateWhatsAppConfig | null;
  selectedGroupId: string;
  enabled: boolean;
  testMessage: string;
  error: string | null;
};

const createImobiliariaSchema = z.object({
  imobiliariaNome: z.string().min(1, 'Informe o nome da imobiliaria'),
  imobiliariaTelefone: z
    .string()
    .min(1, 'Telefone e obrigatorio')
    .refine((value) => {
      const length = onlyDigits(value).length;
      return length === 10 || length === 11;
    }, 'Informe um telefone com DDD valido'),
  imobiliariaEmail: z.string().email('Informe um email valido').or(z.literal('')),
  imobiliariaCnpj: z
    .string()
    .refine((value) => value.trim().length === 0 || onlyDigits(value).length === 14, 'CNPJ deve conter 14 digitos'),
  adminNome: z.string().min(1, 'Informe o nome do administrador'),
  adminTelefone: z
    .string()
    .min(1, 'Telefone e obrigatorio')
    .refine((value) => {
      const length = onlyDigits(value).length;
      return length === 10 || length === 11;
    }, 'Informe um telefone com DDD valido'),
  adminEmail: z.string().email('Informe um email valido'),
  adminPassword: z.string().min(6, 'A senha deve ter no minimo 6 caracteres'),
  limiteUsuarios: z
    .string()
    .refine((value) => {
      const trimmedValue = value.trim();

      if (trimmedValue.length === 0) {
        return true;
      }

      const parsedValue = Number(trimmedValue);
      return Number.isInteger(parsedValue) && parsedValue >= 0;
    }, 'Use um numero inteiro maior ou igual a zero, ou deixe em branco para ilimitado.'),
});

type CreateImobiliariaFormData = z.infer<typeof createImobiliariaSchema>;

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

function formatBrazilianPhone(value: string) {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length <= 2) {
    return digits;
  }

  const ddd = digits.slice(0, 2);
  const remaining = digits.slice(2);

  if (remaining.length <= 4) {
    return `(${ddd}) ${remaining}`;
  }

  if (remaining.length <= 8) {
    return `(${ddd}) ${remaining.slice(0, 4)}-${remaining.slice(4)}`;
  }

  return `(${ddd}) ${remaining.slice(0, 5)}-${remaining.slice(5)}`;
}

function formatCnpjInput(value: string) {
  const digits = onlyDigits(value).slice(0, 14);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 5) {
    return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  }

  if (digits.length <= 8) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  }

  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }

  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function formatPhone(value?: string | null) {
  if (!value) {
    return '-';
  }

  return formatBrazilianPhone(value);
}

function formatCnpj(value?: string | null) {
  if (!value) {
    return '-';
  }

  return formatCnpjInput(value);
}

function formatDate(value?: string | null) {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return dateFormatter.format(parsed);
}

function formatUserLimit(value: number | null) {
  return value === null ? 'Ilimitado' : `${value} usuario(s)`;
}

function normalizeOptionalText(value: string) {
  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
}

function formatMessageLogDate(value?: string | null) {
  return formatDate(value);
}

function getWhatsAppConfigLabel(imobiliaria: AdminImobiliaria) {
  const config = imobiliaria.whatsappConfig;

  if (!config) {
    return {
      badge: 'Nao informado',
      variant: 'neutral' as const,
      detail: 'Abra a configuracao para validar.',
    };
  }

  if (config.enabled && config.groupId) {
    return {
      badge: 'Habilitado',
      variant: 'success' as const,
      detail: config.groupName || config.groupId,
    };
  }

  if (config.groupId) {
    return {
      badge: 'Desabilitado',
      variant: 'warning' as const,
      detail: config.groupName || config.groupId,
    };
  }

  return {
    badge: 'Sem grupo',
    variant: 'neutral' as const,
    detail: 'Nenhum grupo vinculado.',
  };
}

export function ConfigsAdminPage() {
  const [imobiliarias, setImobiliarias] = useState<AdminImobiliaria[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [feedback, setFeedback] = useState<FeedbackToastState | null>(null);
  const [editingLimitTarget, setEditingLimitTarget] = useState<AdminImobiliaria | null>(null);
  const [limitInput, setLimitInput] = useState('');
  const [limitError, setLimitError] = useState<string | null>(null);
  const [statusAction, setStatusAction] = useState<StatusActionState | null>(null);
  const [savingTargetId, setSavingTargetId] = useState<EntityId | null>(null);
  const [whatsappConnection, setWhatsappConnection] = useState<WhatsAppConnection | null>(null);
  const [whatsappInstanceDraft, setWhatsappInstanceDraft] = useState('trackimob-main');
  const [whatsappStatusError, setWhatsappStatusError] = useState<string | null>(null);
  const [isWhatsAppStatusLoading, setIsWhatsAppStatusLoading] = useState(false);
  const [isWhatsAppActionLoading, setIsWhatsAppActionLoading] = useState(false);
  const [whatsappGroups, setWhatsappGroups] = useState<WhatsAppGroup[]>([]);
  const [whatsappGroupsError, setWhatsappGroupsError] = useState<string | null>(null);
  const [isWhatsAppGroupsLoading, setIsWhatsAppGroupsLoading] = useState(false);
  const [whatsappLogs, setWhatsappLogs] = useState<WhatsAppMessageLog[]>([]);
  const [whatsappLogsError, setWhatsappLogsError] = useState<string | null>(null);
  const [isWhatsAppLogsLoading, setIsWhatsAppLogsLoading] = useState(false);
  const [whatsappConfigModal, setWhatsappConfigModal] = useState<WhatsAppConfigModalState | null>(null);
  const [isWhatsappConfigLoading, setIsWhatsappConfigLoading] = useState(false);
  const [isWhatsappConfigSaving, setIsWhatsappConfigSaving] = useState(false);
  const [isWhatsappTestSending, setIsWhatsappTestSending] = useState(false);

  const deferredSearchTerm = useDeferredValue(searchTerm);
  const normalizedSearch = deferredSearchTerm.trim().toLowerCase();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateImobiliariaFormData>({
    resolver: zodResolver(createImobiliariaSchema),
    defaultValues: {
      imobiliariaNome: '',
      imobiliariaTelefone: '',
      imobiliariaEmail: '',
      imobiliariaCnpj: '',
      adminNome: '',
      adminTelefone: '',
      adminEmail: '',
      adminPassword: '',
      limiteUsuarios: '',
    },
  });

  const loadImobiliarias = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getAdminImobiliarias();
      setImobiliarias(response);
    } catch (apiError) {
      setImobiliarias([]);
      setError(toFriendlyError(apiError, 'Nao foi possivel carregar as imobiliarias.'));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAdminWhatsAppStatus = useCallback(async () => {
    setIsWhatsAppStatusLoading(true);
    setWhatsappStatusError(null);

    try {
      const connection = await getAdminWhatsAppStatus();
      setWhatsappConnection(connection);

      if (connection?.instanceName) {
        setWhatsappInstanceDraft(connection.instanceName);
      }

      return connection;
    } catch (apiError) {
      setWhatsappConnection(null);
      setWhatsappStatusError(toFriendlyError(apiError, 'Nao foi possivel carregar o status do WhatsApp.'));
      throw apiError;
    } finally {
      setIsWhatsAppStatusLoading(false);
    }
  }, []);

  const loadAdminWhatsAppGroups = useCallback(async () => {
    setIsWhatsAppGroupsLoading(true);
    setWhatsappGroupsError(null);

    try {
      const groups = await getAdminWhatsAppGroups();
      setWhatsappGroups(groups);
      return groups;
    } catch (apiError) {
      setWhatsappGroups([]);
      setWhatsappGroupsError(toFriendlyError(apiError, 'Nao foi possivel carregar os grupos do WhatsApp.'));
      throw apiError;
    } finally {
      setIsWhatsAppGroupsLoading(false);
    }
  }, []);

  const loadAdminWhatsAppLogs = useCallback(async () => {
    setIsWhatsAppLogsLoading(true);
    setWhatsappLogsError(null);

    try {
      const logs = await getAdminWhatsAppLogs();
      setWhatsappLogs(logs);
      return logs;
    } catch (apiError) {
      setWhatsappLogs([]);
      setWhatsappLogsError(toFriendlyError(apiError, 'Nao foi possivel carregar o historico do WhatsApp.'));
      throw apiError;
    } finally {
      setIsWhatsAppLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadImobiliarias();
  }, [loadImobiliarias]);

  useEffect(() => {
    void loadAdminWhatsAppStatus().catch(() => undefined);
    void loadAdminWhatsAppLogs().catch(() => undefined);
  }, [loadAdminWhatsAppLogs, loadAdminWhatsAppStatus]);

  useEffect(() => {
    if (!whatsappConnection?.isConnected) {
      return undefined;
    }

    void loadAdminWhatsAppGroups().catch(() => undefined);
    return undefined;
  }, [loadAdminWhatsAppGroups, whatsappConnection?.isConnected]);

  const filteredImobiliarias = useMemo(() => {
    if (!normalizedSearch) {
      return imobiliarias;
    }

    const searchDigits = onlyDigits(normalizedSearch);

    return imobiliarias.filter((imobiliaria) => {
      const fields = [
        imobiliaria.nome,
        imobiliaria.email ?? '',
        imobiliaria.telefone ?? '',
        imobiliaria.cnpj ?? '',
        imobiliaria.ativa ? 'ativa ativo' : 'inativa inativo',
        String(imobiliaria.id),
      ]
        .join(' ')
        .toLowerCase();
      const numericFields = [imobiliaria.telefone ?? '', imobiliaria.cnpj ?? ''].map(onlyDigits).join(' ');

      return fields.includes(normalizedSearch) || (searchDigits.length > 0 && numericFields.includes(searchDigits));
    });
  }, [imobiliarias, normalizedSearch]);

  const activeCount = useMemo(() => imobiliarias.filter((imobiliaria) => imobiliaria.ativa).length, [imobiliarias]);
  const totalActiveUsers = useMemo(
    () => imobiliarias.reduce((total, imobiliaria) => total + imobiliaria.usuariosAtivos, 0),
    [imobiliarias],
  );
  const limitedAgenciesCount = useMemo(
    () => imobiliarias.filter((imobiliaria) => imobiliaria.limiteUsuarios !== null).length,
    [imobiliarias],
  );

  const syncImobiliaria = (nextImobiliaria: AdminImobiliaria) => {
    setImobiliarias((currentImobiliarias) =>
      currentImobiliarias.map((imobiliaria) =>
        String(imobiliaria.id) === String(nextImobiliaria.id) ? nextImobiliaria : imobiliaria,
      ),
    );
  };

  const openLimitModal = (imobiliaria: AdminImobiliaria) => {
    setLimitError(null);
    setEditingLimitTarget(imobiliaria);
    setLimitInput(imobiliaria.limiteUsuarios === null ? '' : String(imobiliaria.limiteUsuarios));
  };

  const closeLimitModal = () => {
    if (savingTargetId !== null) {
      return;
    }

    setEditingLimitTarget(null);
    setLimitError(null);
    setLimitInput('');
  };

  const handleCreateImobiliaria = async (data: CreateImobiliariaFormData) => {
    setCreateError(null);

    const trimmedLimit = data.limiteUsuarios.trim();
    const limiteUsuarios = trimmedLimit.length === 0 ? null : Number(trimmedLimit);

    try {
      const createdImobiliaria = await createAdminImobiliaria({
        imobiliaria: {
          nome: data.imobiliariaNome.trim(),
          telefone: onlyDigits(data.imobiliariaTelefone),
          email: normalizeOptionalText(data.imobiliariaEmail),
          cnpj: normalizeOptionalText(onlyDigits(data.imobiliariaCnpj)),
        },
        admin: {
          nome: data.adminNome.trim(),
          telefone: onlyDigits(data.adminTelefone),
          email: data.adminEmail.trim(),
          password: data.adminPassword,
        },
        configuracao: {
          limiteUsuarios,
        },
      });

      await loadImobiliarias();
      reset();
      setFeedback({
        title: 'Imobiliaria cadastrada',
        description: `${createdImobiliaria?.nome ?? data.imobiliariaNome.trim()} foi adicionada com sucesso.`,
        variant: 'success',
      });
    } catch (apiError) {
      setCreateError(toFriendlyError(apiError, 'Nao foi possivel cadastrar a imobiliaria.'));
    }
  };

  const handleSaveLimit = async () => {
    if (!editingLimitTarget) {
      return;
    }

    const trimmedLimit = limitInput.trim();
    const nextLimit = trimmedLimit.length === 0 ? null : Number(trimmedLimit);

    if (nextLimit !== null && (!Number.isInteger(nextLimit) || nextLimit < 0)) {
      setLimitError('Informe um numero inteiro maior ou igual a zero, ou deixe em branco para ilimitado.');
      return;
    }

    setSavingTargetId(editingLimitTarget.id);
    setLimitError(null);

    try {
      const updatedImobiliaria = await updateAdminImobiliariaConfig(editingLimitTarget.id, {
        limiteUsuarios: nextLimit,
      });
      syncImobiliaria(updatedImobiliaria);
      setFeedback({
        title: 'Limite atualizado',
        description: `O limite de usuarios da imobiliaria ${updatedImobiliaria.nome} foi atualizado.`,
        variant: 'success',
      });
      closeLimitModal();
    } catch (apiError) {
      setLimitError(toFriendlyError(apiError, 'Nao foi possivel atualizar o limite de usuarios.'));
    } finally {
      setSavingTargetId(null);
    }
  };

  const handleConfirmStatusAction = async () => {
    if (!statusAction) {
      return;
    }

    setSavingTargetId(statusAction.imobiliaria.id);

    try {
      const updatedImobiliaria =
        statusAction.action === 'inativar'
          ? await inativarAdminImobiliaria(statusAction.imobiliaria.id)
          : await reativarAdminImobiliaria(statusAction.imobiliaria.id);

      syncImobiliaria(updatedImobiliaria);
      setFeedback({
        title: statusAction.action === 'inativar' ? 'Imobiliaria inativada' : 'Imobiliaria reativada',
        description:
          statusAction.action === 'inativar'
            ? `${updatedImobiliaria.nome} nao deve mais ter acesso ao sistema.`
            : `${updatedImobiliaria.nome} voltou a ter acesso ao sistema.`,
        variant: 'success',
      });
      setStatusAction(null);
    } catch (apiError) {
      setFeedback({
        title: 'Nao foi possivel atualizar o status',
        description: toFriendlyError(apiError, 'Tente novamente em instantes.'),
        variant: 'error',
      });
    } finally {
      setSavingTargetId(null);
    }
  };

  const handleCreateWhatsAppInstance = async () => {
    setIsWhatsAppActionLoading(true);
    setWhatsappStatusError(null);

    try {
      const createdConnection = await createAdminWhatsAppInstance(whatsappInstanceDraft);
      const qrConnection = await getAdminWhatsAppQrCode(createdConnection.instanceName || whatsappInstanceDraft).catch(() => null);
      const nextConnection = qrConnection ?? createdConnection;
      setWhatsappConnection(nextConnection);

      if (nextConnection.instanceName) {
        setWhatsappInstanceDraft(nextConnection.instanceName);
      }

      setFeedback({
        title: 'Conexao iniciada',
        description: 'A instancia global foi criada e o QR Code foi solicitado ao backend.',
        variant: 'success',
      });
    } catch (apiError) {
      setWhatsappStatusError(toFriendlyError(apiError, 'Nao foi possivel iniciar a conexao do WhatsApp.'));
      setFeedback({
        title: 'Falha ao conectar WhatsApp',
        description: toFriendlyError(apiError, 'Revise a Evolution API e tente novamente.'),
        variant: 'error',
      });
    } finally {
      setIsWhatsAppActionLoading(false);
    }
  };

  const handleRefreshWhatsAppQr = async () => {
    setIsWhatsAppActionLoading(true);
    setWhatsappStatusError(null);

    try {
      const qrConnection = await getAdminWhatsAppQrCode(whatsappConnection?.instanceName || whatsappInstanceDraft);
      setWhatsappConnection((currentConnection) => ({
        ...(currentConnection ?? qrConnection),
        ...qrConnection,
        instanceName: qrConnection.instanceName || currentConnection?.instanceName || whatsappInstanceDraft,
      }));
      setFeedback({
        title: 'QR Code atualizado',
        description: 'Um novo QR Code foi carregado para a instancia global.',
        variant: 'info',
      });
    } catch (apiError) {
      setWhatsappStatusError(toFriendlyError(apiError, 'Nao foi possivel atualizar o QR Code.'));
    } finally {
      setIsWhatsAppActionLoading(false);
    }
  };

  const handleRestartWhatsApp = async () => {
    setIsWhatsAppActionLoading(true);
    setWhatsappStatusError(null);

    try {
      const restartedConnection = await restartAdminWhatsApp();
      if (restartedConnection) {
        setWhatsappConnection(restartedConnection);
      }
      await loadAdminWhatsAppStatus().catch(() => undefined);
      setFeedback({
        title: 'WhatsApp reiniciado',
        description: 'O backend recebeu a solicitacao de restart da instancia global.',
        variant: 'success',
      });
    } catch (apiError) {
      setWhatsappStatusError(toFriendlyError(apiError, 'Nao foi possivel reiniciar o WhatsApp.'));
    } finally {
      setIsWhatsAppActionLoading(false);
    }
  };

  const handleLogoutWhatsApp = async () => {
    setIsWhatsAppActionLoading(true);
    setWhatsappStatusError(null);

    try {
      const loggedOutConnection = await logoutAdminWhatsApp();
      setWhatsappConnection(
        loggedOutConnection
          ? {
              ...loggedOutConnection,
              isConnected: false,
              qrCodeBase64: null,
              pairingCode: null,
              connectedNumber: null,
            }
          : null,
      );
      setWhatsappGroups([]);
      setFeedback({
        title: 'WhatsApp desconectado',
        description: 'A instancia global foi desconectada.',
        variant: 'success',
      });
    } catch (apiError) {
      setWhatsappStatusError(toFriendlyError(apiError, 'Nao foi possivel desconectar o WhatsApp.'));
    } finally {
      setIsWhatsAppActionLoading(false);
    }
  };

  const openWhatsAppConfigModal = async (imobiliaria: AdminImobiliaria) => {
    setIsWhatsappConfigLoading(true);
    setWhatsappConfigModal({
      imobiliaria,
      config: null,
      selectedGroupId: '',
      enabled: true,
      testMessage: `Mensagem de teste do TrackImob para ${imobiliaria.nome}.`,
      error: null,
    });

    try {
      const [config] = await Promise.all([
        getRealEstateWhatsAppConfig(imobiliaria.id),
        whatsappGroups.length > 0 ? Promise.resolve(whatsappGroups) : loadAdminWhatsAppGroups().catch(() => []),
      ]);
      setWhatsappConfigModal((currentModal) =>
        currentModal
          ? {
              ...currentModal,
              config,
              selectedGroupId: config.groupId ?? '',
              enabled: config.enabled,
            }
          : currentModal,
      );
    } catch (apiError) {
      setWhatsappConfigModal((currentModal) =>
        currentModal
          ? {
              ...currentModal,
              error: toFriendlyError(apiError, 'Nao foi possivel carregar a configuracao de WhatsApp desta imobiliaria.'),
            }
          : currentModal,
      );
    } finally {
      setIsWhatsappConfigLoading(false);
    }
  };

  const closeWhatsAppConfigModal = () => {
    if (isWhatsappConfigSaving || isWhatsappTestSending) {
      return;
    }

    setWhatsappConfigModal(null);
  };

  const handleSaveWhatsAppConfig = async () => {
    if (!whatsappConfigModal) {
      return;
    }

    const selectedGroup = whatsappGroups.find((group) => group.id === whatsappConfigModal.selectedGroupId);

    if (whatsappConfigModal.enabled && !selectedGroup) {
      setWhatsappConfigModal({
        ...whatsappConfigModal,
        error: 'Selecione um grupo para ativar o WhatsApp desta imobiliaria.',
      });
      return;
    }

    setIsWhatsappConfigSaving(true);

    try {
      const config = await saveRealEstateWhatsAppConfig(whatsappConfigModal.imobiliaria.id, {
        groupId: selectedGroup?.id ?? null,
        groupName: selectedGroup?.name ?? null,
        enabled: whatsappConfigModal.enabled,
      });
      setImobiliarias((currentImobiliarias) =>
        currentImobiliarias.map((imobiliaria) =>
          String(imobiliaria.id) === String(whatsappConfigModal.imobiliaria.id)
            ? {
                ...imobiliaria,
                whatsappConfig: {
                  groupId: config.groupId,
                  groupName: config.groupName,
                  enabled: config.enabled,
                },
              }
            : imobiliaria,
        ),
      );
      setWhatsappConfigModal({
        ...whatsappConfigModal,
        config,
        selectedGroupId: config.groupId ?? '',
        enabled: config.enabled,
        error: null,
      });
      setFeedback({
        title: 'Grupo salvo',
        description: `A configuracao de WhatsApp da imobiliaria ${whatsappConfigModal.imobiliaria.nome} foi atualizada.`,
        variant: 'success',
      });
    } catch (apiError) {
      setWhatsappConfigModal({
        ...whatsappConfigModal,
        error: toFriendlyError(apiError, 'Nao foi possivel salvar o grupo desta imobiliaria.'),
      });
    } finally {
      setIsWhatsappConfigSaving(false);
    }
  };

  const handleSendWhatsAppGroupTest = async () => {
    if (!whatsappConfigModal) {
      return;
    }

    if (!whatsappConfigModal.testMessage.trim()) {
      setWhatsappConfigModal({
        ...whatsappConfigModal,
        error: 'Digite uma mensagem de teste antes de enviar.',
      });
      return;
    }

    setIsWhatsappTestSending(true);

    try {
      await sendRealEstateWhatsAppGroupTest(whatsappConfigModal.imobiliaria.id, whatsappConfigModal.testMessage);
      await loadAdminWhatsAppLogs().catch(() => undefined);
      setFeedback({
        title: 'Mensagem de teste enviada',
        description: `O envio para o grupo de ${whatsappConfigModal.imobiliaria.nome} foi solicitado ao backend.`,
        variant: 'success',
      });
      setWhatsappConfigModal({
        ...whatsappConfigModal,
        error: null,
      });
    } catch (apiError) {
      setWhatsappConfigModal({
        ...whatsappConfigModal,
        error: toFriendlyError(apiError, 'Nao foi possivel enviar a mensagem de teste.'),
      });
    } finally {
      setIsWhatsappTestSending(false);
    }
  };

  return (
    <main className="admin-config-page">
      <PageHeader
        title="Configuracoes administrativas"
        subtitle="Cadastre imobiliarias, defina limites de usuarios e mantenha a governanca da operacao global em um unico lugar."
        actions={
          <Button
            variant="secondary"
            icon={<RefreshCw size={16} aria-hidden="true" />}
            onClick={() => void loadImobiliarias()}
            disabled={loading || isSubmitting || savingTargetId !== null}
          >
            Atualizar
          </Button>
        }
      />

      {feedback ? (
        <div className="toast-stack">
          <Toast title={feedback.title} description={feedback.description} variant={feedback.variant} onClose={() => setFeedback(null)} />
        </div>
      ) : null}

      <section className="admin-config-metrics">
        <Card className="admin-config-metric-card">
          <span>Total de imobiliarias</span>
          <strong>{imobiliarias.length}</strong>
          <p>{activeCount} ativa(s) no sistema.</p>
        </Card>
        <Card className="admin-config-metric-card">
          <span>Usuarios ativos</span>
          <strong>{totalActiveUsers}</strong>
          <p>Soma retornada pelas imobiliarias carregadas.</p>
        </Card>
        <Card className="admin-config-metric-card">
          <span>Com limite configurado</span>
          <strong>{limitedAgenciesCount}</strong>
          <p>Imobiliarias com teto de usuarios definido.</p>
        </Card>
      </section>

      <section className="admin-whatsapp-panel">
        <Card
          className="whatsapp-card whatsapp-card--status"
          title="WhatsApp do sistema"
          subtitle="Conecte a instancia global da Evolution API usada para enviar mensagens aos usuarios e aos grupos das imobiliarias."
          actions={
            <Button
              variant="secondary"
              icon={<RefreshCw size={16} aria-hidden="true" />}
              onClick={() => void loadAdminWhatsAppStatus().catch(() => undefined)}
              disabled={isWhatsAppStatusLoading || isWhatsAppActionLoading}
            >
              {isWhatsAppStatusLoading ? 'Atualizando...' : 'Atualizar status'}
            </Button>
          }
        >
          {whatsappStatusError ? <div className="global-error">{whatsappStatusError}</div> : null}

          <div className="whatsapp-status-hero">
            <div className="whatsapp-status-hero__icon" aria-hidden="true">
              <Smartphone size={22} />
            </div>
            <div className="whatsapp-status-hero__copy">
              <div className="whatsapp-status-hero__badges">
                <WhatsAppStatusBadge status={whatsappConnection?.status} />
                {whatsappConnection?.connectedNumber ? (
                  <span className="whatsapp-status-hero__number">{whatsappConnection.connectedNumber}</span>
                ) : null}
              </div>
              <h3>{whatsappConnection?.profileName || whatsappConnection?.instanceName || 'Instancia global TrackImob'}</h3>
              <p>
                {whatsappConnection?.isConnected
                  ? 'A instancia esta conectada e pronta para buscar grupos e disparar mensagens pelo backend.'
                  : 'Crie ou reconecte a instancia global para liberar o QR Code e configurar grupos por imobiliaria.'}
              </p>
            </div>
          </div>

          <div className="whatsapp-summary-grid">
            <div className="whatsapp-summary-item">
              <span>Instancia</span>
              <strong>{whatsappConnection?.instanceName || whatsappInstanceDraft || 'trackimob-main'}</strong>
            </div>
            <div className="whatsapp-summary-item">
              <span>Numero conectado</span>
              <strong>{whatsappConnection?.connectedNumber || 'Nao conectado'}</strong>
            </div>
            <div className="whatsapp-summary-item">
              <span>Grupos carregados</span>
              <strong>{whatsappGroups.length}</strong>
            </div>
          </div>

          <div className="whatsapp-actions-grid">
            <Input
              id="admin-whatsapp-instance-name"
              label="Nome da instancia"
              value={whatsappInstanceDraft}
              placeholder="trackimob-main"
              onChange={(event) => setWhatsappInstanceDraft(event.target.value)}
              hint="O backend pode ignorar este campo se usar EVOLUTION_INSTANCE_NAME fixo."
            />
            <div className="whatsapp-actions-grid__buttons">
              <Button
                icon={<Smartphone size={16} aria-hidden="true" />}
                onClick={handleCreateWhatsAppInstance}
                disabled={isWhatsAppActionLoading}
              >
                {isWhatsAppActionLoading ? 'Processando...' : 'Conectar'}
              </Button>
              <Button
                variant="secondary"
                icon={<RefreshCw size={16} aria-hidden="true" />}
                onClick={handleRefreshWhatsAppQr}
                disabled={isWhatsAppActionLoading}
              >
                Gerar QR
              </Button>
              <Button
                variant="secondary"
                icon={<RefreshCw size={16} aria-hidden="true" />}
                onClick={handleRestartWhatsApp}
                disabled={isWhatsAppActionLoading}
              >
                Reiniciar
              </Button>
              <Button
                variant="danger"
                icon={<Power size={16} aria-hidden="true" />}
                onClick={handleLogoutWhatsApp}
                disabled={isWhatsAppActionLoading || !whatsappConnection}
              >
                Desconectar
              </Button>
            </div>
          </div>
        </Card>

        <WhatsAppQRCodeCard
          connection={whatsappConnection}
          isLoading={isWhatsAppStatusLoading || isWhatsAppActionLoading}
          error={null}
          onRefresh={handleRefreshWhatsAppQr}
        />
      </section>

      <section className="admin-whatsapp-panel admin-whatsapp-panel--secondary">
        <Card
          className="whatsapp-card"
          title="Grupos disponiveis"
          subtitle="Use a lista retornada pela Evolution API para vincular um grupo a cada imobiliaria."
          actions={
            <Button
              variant="secondary"
              icon={<RefreshCw size={16} aria-hidden="true" />}
              onClick={() => void loadAdminWhatsAppGroups().catch(() => undefined)}
              disabled={isWhatsAppGroupsLoading || !whatsappConnection?.isConnected}
            >
              {isWhatsAppGroupsLoading ? 'Carregando...' : 'Buscar grupos'}
            </Button>
          }
        >
          {whatsappGroupsError ? <div className="global-error">{whatsappGroupsError}</div> : null}
          {isWhatsAppGroupsLoading ? (
            <div className="table-skeleton">
              <Skeleton height={52} />
              <Skeleton height={52} />
              <Skeleton height={52} />
            </div>
          ) : null}
          {!isWhatsAppGroupsLoading && whatsappGroups.length === 0 ? (
            <EmptyState
              title="Nenhum grupo carregado"
              description="Conecte a instancia global e clique em buscar grupos para preencher as opcoes por imobiliaria."
            />
          ) : null}
          {!isWhatsAppGroupsLoading && whatsappGroups.length > 0 ? (
            <div className="admin-whatsapp-group-list">
              {whatsappGroups.slice(0, 6).map((group) => (
                <div key={group.id} className="admin-whatsapp-group-row">
                  <div>
                    <strong>{group.name}</strong>
                    <span>{group.id}</span>
                  </div>
                  <Badge variant="info">{group.participantsCount ?? 0} participantes</Badge>
                </div>
              ))}
            </div>
          ) : null}
        </Card>

        <Card
          title="Historico recente"
          subtitle="Ultimos envios registrados pelo backend para auditoria operacional."
          actions={
            <Button
              variant="secondary"
              icon={<RefreshCw size={16} aria-hidden="true" />}
              onClick={() => void loadAdminWhatsAppLogs().catch(() => undefined)}
              disabled={isWhatsAppLogsLoading}
            >
              {isWhatsAppLogsLoading ? 'Atualizando...' : 'Atualizar'}
            </Button>
          }
        >
          {whatsappLogsError ? <div className="global-error">{whatsappLogsError}</div> : null}
          {isWhatsAppLogsLoading ? (
            <div className="table-skeleton">
              <Skeleton height={44} />
              <Skeleton height={44} />
              <Skeleton height={44} />
            </div>
          ) : null}
          {!isWhatsAppLogsLoading && whatsappLogs.length === 0 ? (
            <EmptyState title="Nenhum envio registrado" description="Os envios de teste e mensagens futuras aparecerao aqui." />
          ) : null}
          {!isWhatsAppLogsLoading && whatsappLogs.length > 0 ? (
            <TableContainer>
              <Table>
                <thead>
                  <tr>
                    <th>Destino</th>
                    <th>Status</th>
                    <th>Mensagem</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {whatsappLogs.slice(0, 8).map((log) => (
                    <tr key={log.id}>
                      <td>
                        <strong>{log.groupName || log.userName || log.realEstateName || log.groupId || '-'}</strong>
                        <br />
                        <span className="ui-field__hint">{log.targetType}</span>
                      </td>
                      <td>
                        <Badge variant={log.status === 'sent' ? 'success' : log.status === 'failed' ? 'danger' : 'warning'}>
                          {log.status}
                        </Badge>
                      </td>
                      <td>{log.message || log.errorMessage || '-'}</td>
                      <td>{formatMessageLogDate(log.sentAt ?? log.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableContainer>
          ) : null}
        </Card>
      </section>

      <div className="admin-config-layout">
        <Card
          className="saas-accent-card"
          title="Cadastrar imobiliaria"
          subtitle="Crie uma nova conta de imobiliaria com o admin inicial e, se quiser, defina o limite de usuarios ja no cadastro."
        >
          {createError ? <div className="global-error">{createError}</div> : null}

          <form className="admin-config-form" onSubmit={handleSubmit(handleCreateImobiliaria)} noValidate>
            <section className="admin-config-form__section">
              <div className="admin-config-form__section-header">
                <h3>Dados da imobiliaria</h3>
                <p>Essas informacoes identificam a conta e ajudam na governanca do ambiente.</p>
              </div>

              <div className="saas-form-grid">
                <div className="saas-form-span-2">
                  <Input
                    id="admin-create-imobiliaria-nome"
                    label="Nome da imobiliaria"
                    error={errors.imobiliariaNome?.message}
                    {...register('imobiliariaNome')}
                  />
                </div>
                <Input
                  id="admin-create-imobiliaria-telefone"
                  label="Telefone"
                  inputMode="numeric"
                  placeholder="(11) 99999-9999"
                  error={errors.imobiliariaTelefone?.message}
                  {...register('imobiliariaTelefone', {
                    onChange: (event) => {
                      event.target.value = formatBrazilianPhone(event.target.value);
                    },
                  })}
                />
                <Input
                  id="admin-create-imobiliaria-email"
                  label="Email"
                  type="email"
                  placeholder="contato@imobiliaria.com"
                  error={errors.imobiliariaEmail?.message}
                  {...register('imobiliariaEmail')}
                />
                <Input
                  id="admin-create-imobiliaria-cnpj"
                  label="CNPJ"
                  inputMode="numeric"
                  placeholder="00.000.000/0000-00"
                  error={errors.imobiliariaCnpj?.message}
                  {...register('imobiliariaCnpj', {
                    onChange: (event) => {
                      event.target.value = formatCnpjInput(event.target.value);
                    },
                  })}
                />
                <Input
                  id="admin-create-imobiliaria-limite"
                  label="Limite de usuarios"
                  type="number"
                  min={0}
                  step={1}
                  placeholder="Em branco = ilimitado"
                  hint="Use um numero inteiro. Campo vazio representa limite ilimitado."
                  error={errors.limiteUsuarios?.message}
                  {...register('limiteUsuarios')}
                />
              </div>
            </section>

            <section className="admin-config-form__section">
              <div className="admin-config-form__section-header">
                <h3>Admin inicial</h3>
                <p>Esse usuario sera o primeiro administrador da nova imobiliaria.</p>
              </div>

              <div className="saas-form-grid">
                <div className="saas-form-span-2">
                  <Input
                    id="admin-create-admin-nome"
                    label="Nome do administrador"
                    error={errors.adminNome?.message}
                    {...register('adminNome')}
                  />
                </div>
                <Input
                  id="admin-create-admin-telefone"
                  label="Telefone"
                  inputMode="numeric"
                  placeholder="(11) 99999-9999"
                  error={errors.adminTelefone?.message}
                  {...register('adminTelefone', {
                    onChange: (event) => {
                      event.target.value = formatBrazilianPhone(event.target.value);
                    },
                  })}
                />
                <Input
                  id="admin-create-admin-email"
                  label="Email"
                  type="email"
                  placeholder="admin@imobiliaria.com"
                  error={errors.adminEmail?.message}
                  {...register('adminEmail')}
                />
                <div className="saas-form-span-2">
                  <Input
                    id="admin-create-admin-password"
                    label="Senha inicial"
                    type="password"
                    autoComplete="new-password"
                    hint="A senha precisa ter pelo menos 6 caracteres."
                    error={errors.adminPassword?.message}
                    {...register('adminPassword')}
                  />
                </div>
              </div>
            </section>

            <div className="admin-config-form__footer">
              <p className="admin-config-form__footer-copy">
                O cadastro cria a imobiliaria, o admin inicial e deixa a conta pronta para receber configuracoes futuras.
              </p>
              <Button type="submit" disabled={isSubmitting || savingTargetId !== null}>
                {isSubmitting ? 'Cadastrando...' : 'Cadastrar imobiliaria'}
              </Button>
            </div>
          </form>
        </Card>

        <Card
          title="Imobiliarias"
          subtitle={
            !loading && !error
              ? `${filteredImobiliarias.length} imobiliaria(s) visivel(is)${normalizedSearch ? ' com o filtro atual.' : '.'}`
              : 'Liste e gerencie todas as imobiliarias cadastradas no sistema.'
          }
          actions={
            <Input
              id="admin-imobiliarias-search"
              label="Buscar"
              placeholder="Nome, e-mail, CNPJ, telefone ou status"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          }
        >
          {error ? <div className="global-error">{error}</div> : null}

          {loading ? (
            <div className="table-skeleton">
              <Skeleton height={48} />
              <Skeleton height={48} />
              <Skeleton height={48} />
              <Skeleton height={48} />
            </div>
          ) : null}

          {!loading && !error && imobiliarias.length === 0 ? (
            <EmptyState
              title="Nenhuma imobiliaria encontrada"
              description="Quando novas imobiliarias forem cadastradas, elas aparecerao aqui para configuracao."
              action={
                <Button size="sm" onClick={() => void loadImobiliarias()}>
                  Recarregar
                </Button>
              }
            />
          ) : null}

          {!loading && !error && imobiliarias.length > 0 && filteredImobiliarias.length === 0 ? (
            <EmptyState
              title="Nenhuma imobiliaria corresponde ao filtro"
              description="Tente buscar por outro nome, e-mail, CNPJ, telefone ou status."
            />
          ) : null}

          {!loading && !error && filteredImobiliarias.length > 0 ? (
            <TableContainer>
              <Table>
                <thead>
                  <tr>
                    <th>Imobiliaria</th>
                    <th>Contato</th>
                    <th>CNPJ</th>
                    <th>Status</th>
                    <th>WhatsApp</th>
                    <th>Usuarios</th>
                    <th>Limite</th>
                    <th>Atualizacao</th>
                    <th>Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredImobiliarias.map((imobiliaria) => {
                    const isSaving = savingTargetId !== null && String(savingTargetId) === String(imobiliaria.id);
                    const whatsappConfigLabel = getWhatsAppConfigLabel(imobiliaria);

                    return (
                      <tr key={imobiliaria.id}>
                        <td>
                          <strong>{imobiliaria.nome}</strong>
                          <br />
                          <span className="ui-field__hint">ID {imobiliaria.id}</span>
                        </td>
                        <td>
                          <span>{imobiliaria.email ?? '-'}</span>
                          <br />
                          <span className="ui-field__hint">{formatPhone(imobiliaria.telefone)}</span>
                        </td>
                        <td>{formatCnpj(imobiliaria.cnpj)}</td>
                        <td>
                          <Badge variant={imobiliaria.ativa ? 'success' : 'danger'}>
                            {imobiliaria.ativa ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </td>
                        <td>
                          <Badge variant={whatsappConfigLabel.variant}>{whatsappConfigLabel.badge}</Badge>
                          <br />
                          <span className="ui-field__hint">{whatsappConfigLabel.detail}</span>
                        </td>
                        <td>{imobiliaria.usuariosAtivos}</td>
                        <td>{formatUserLimit(imobiliaria.limiteUsuarios)}</td>
                        <td>{formatDate(imobiliaria.updatedAt ?? imobiliaria.createdAt)}</td>
                        <td className="users-actions-cell">
                          <Button variant="secondary" size="sm" onClick={() => openLimitModal(imobiliaria)} disabled={isSaving}>
                            Editar limite
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={<MessageCircle size={16} aria-hidden="true" />}
                            onClick={() => void openWhatsAppConfigModal(imobiliaria)}
                            disabled={isSaving || isWhatsappConfigLoading}
                          >
                            WhatsApp
                          </Button>
                          <Button
                            variant={imobiliaria.ativa ? 'danger' : 'secondary'}
                            size="sm"
                            onClick={() =>
                              setStatusAction({
                                imobiliaria,
                                action: imobiliaria.ativa ? 'inativar' : 'reativar',
                              })
                            }
                            disabled={isSaving}
                          >
                            {isSaving ? 'Salvando...' : imobiliaria.ativa ? 'Inativar' : 'Reativar'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </TableContainer>
          ) : null}
        </Card>
      </div>

      {editingLimitTarget ? (
        <Modal
          title="Editar limite de usuarios"
          subtitle={editingLimitTarget.nome}
          onClose={closeLimitModal}
          actions={
            <>
              <Button variant="secondary" onClick={closeLimitModal} disabled={savingTargetId !== null}>
                Cancelar
              </Button>
              <Button onClick={handleSaveLimit} disabled={savingTargetId !== null}>
                {savingTargetId !== null ? 'Salvando...' : 'Salvar limite'}
              </Button>
            </>
          }
        >
          {limitError ? <div className="global-error">{limitError}</div> : null}
          <Input
            id="admin-imobiliaria-user-limit"
            label="Limite de usuarios ativos"
            type="number"
            min={0}
            step={1}
            placeholder="Deixe em branco para ilimitado"
            value={limitInput}
            hint="Use um numero inteiro. Campo vazio representa limite ilimitado."
            onChange={(event) => {
              setLimitInput(event.target.value);
              setLimitError(null);
            }}
          />
        </Modal>
      ) : null}

      {statusAction ? (
        <Modal
          title={statusAction.action === 'inativar' ? 'Inativar imobiliaria' : 'Reativar imobiliaria'}
          subtitle={statusAction.imobiliaria.nome}
          onClose={() => {
            if (savingTargetId !== null) {
              return;
            }

            setStatusAction(null);
          }}
          actions={
            <>
              <Button variant="secondary" onClick={() => setStatusAction(null)} disabled={savingTargetId !== null}>
                Cancelar
              </Button>
              <Button
                variant={statusAction.action === 'inativar' ? 'danger' : 'primary'}
                onClick={handleConfirmStatusAction}
                disabled={savingTargetId !== null}
              >
                {savingTargetId !== null
                  ? 'Salvando...'
                  : statusAction.action === 'inativar'
                    ? 'Inativar imobiliaria'
                    : 'Reativar imobiliaria'}
              </Button>
            </>
          }
        >
          <p className="admin-config-modal-copy">
            {statusAction.action === 'inativar'
              ? 'Ao inativar, os usuarios desta imobiliaria devem perder acesso ao sistema assim que o backend aplicar o bloqueio.'
              : 'Ao reativar, os usuarios desta imobiliaria devem voltar a acessar o sistema conforme suas permissoes.'}
          </p>
        </Modal>
      ) : null}

      {whatsappConfigModal ? (
        <Modal
          title="Configurar WhatsApp"
          subtitle={whatsappConfigModal.imobiliaria.nome}
          onClose={closeWhatsAppConfigModal}
          actions={
            <>
              <Button
                variant="secondary"
                onClick={closeWhatsAppConfigModal}
                disabled={isWhatsappConfigSaving || isWhatsappTestSending}
              >
                Fechar
              </Button>
              <Button
                variant="secondary"
                icon={<Send size={16} aria-hidden="true" />}
                onClick={handleSendWhatsAppGroupTest}
                disabled={isWhatsappConfigSaving || isWhatsappTestSending || isWhatsappConfigLoading}
              >
                {isWhatsappTestSending ? 'Enviando...' : 'Enviar teste'}
              </Button>
              <Button
                icon={<Save size={16} aria-hidden="true" />}
                onClick={handleSaveWhatsAppConfig}
                disabled={isWhatsappConfigSaving || isWhatsappTestSending || isWhatsappConfigLoading}
              >
                {isWhatsappConfigSaving ? 'Salvando...' : 'Salvar grupo'}
              </Button>
            </>
          }
        >
          {whatsappConfigModal.error ? <div className="global-error">{whatsappConfigModal.error}</div> : null}
          {isWhatsappConfigLoading ? (
            <div className="table-skeleton">
              <Skeleton height={48} />
              <Skeleton height={48} />
            </div>
          ) : null}

          <div className="admin-whatsapp-modal-grid">
            <Select
              id="admin-whatsapp-real-estate-group"
              label="Grupo da imobiliaria"
              value={whatsappConfigModal.selectedGroupId}
              onChange={(event) =>
                setWhatsappConfigModal({
                  ...whatsappConfigModal,
                  selectedGroupId: event.target.value,
                  error: null,
                })
              }
              disabled={isWhatsappConfigLoading || isWhatsappConfigSaving}
              hint="O ID do grupo sera salvo no backend para os envios desta imobiliaria."
            >
              <option value="">Selecione um grupo</option>
              {whatsappGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} - {group.id}
                </option>
              ))}
            </Select>

            <label className="admin-whatsapp-toggle">
              <input
                type="checkbox"
                checked={whatsappConfigModal.enabled}
                onChange={(event) =>
                  setWhatsappConfigModal({
                    ...whatsappConfigModal,
                    enabled: event.target.checked,
                    error: null,
                  })
                }
              />
              <span>Envio habilitado para esta imobiliaria</span>
            </label>

            <div className="ui-field">
              <label className="ui-label" htmlFor="admin-whatsapp-test-message">
                Mensagem de teste
              </label>
              <textarea
                id="admin-whatsapp-test-message"
                className="ui-control admin-whatsapp-textarea"
                rows={4}
                value={whatsappConfigModal.testMessage}
                onChange={(event) =>
                  setWhatsappConfigModal({
                    ...whatsappConfigModal,
                    testMessage: event.target.value,
                    error: null,
                  })
                }
              />
              <span className="ui-field__hint">
                O teste usa o endpoint da imobiliaria e depende do grupo salvo ou validado pelo backend.
              </span>
            </div>

            {whatsappConfigModal.config ? (
              <div className="admin-whatsapp-config-summary">
                <div>
                  <span>Grupo salvo</span>
                  <strong>{whatsappConfigModal.config.groupName || whatsappConfigModal.config.groupId || 'Nenhum'}</strong>
                </div>
                <div>
                  <span>Status</span>
                  <strong>{whatsappConfigModal.config.enabled ? 'Ativo' : 'Inativo'}</strong>
                </div>
                <div>
                  <span>Atualizacao</span>
                  <strong>{formatDate(whatsappConfigModal.config.updatedAt ?? whatsappConfigModal.config.createdAt)}</strong>
                </div>
              </div>
            ) : null}
          </div>
        </Modal>
      ) : null}
    </main>
  );
}
