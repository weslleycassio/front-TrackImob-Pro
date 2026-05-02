import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useImobiliaria } from '../../hooks/useImobiliaria';
import { useWhatsAppConnection } from '../../hooks/useWhatsAppConnection';
import { useWhatsAppGroups } from '../../hooks/useWhatsAppGroups';
import { WhatsAppConnectionCard } from '../../components/whatsapp/WhatsAppConnectionCard';
import { WhatsAppGroupsCard } from '../../components/whatsapp/WhatsAppGroupsCard';
import { WhatsAppQRCodeCard } from '../../components/whatsapp/WhatsAppQRCodeCard';
import { WhatsAppTestMessageCard } from '../../components/whatsapp/WhatsAppTestMessageCard';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { Toast } from '../../components/ui/Toast';
import { sendWhatsAppTextMessage } from '../../services/whatsappService';
import { toFriendlyError } from '../../utils/errorMessages';

type FeedbackToastState = {
  title: string;
  description?: string;
  variant: 'success' | 'error' | 'info';
};

function slugifyInstanceName(value?: string | null) {
  const baseValue = value?.trim() || 'trackimob-whatsapp';
  const normalizedValue = baseValue
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalizedValue || 'trackimob-whatsapp';
}

export function WhatsAppSettingsPage() {
  const { imobiliaria } = useImobiliaria();
  const defaultInstanceName = useMemo(() => slugifyInstanceName(imobiliaria?.nome), [imobiliaria?.nome]);
  const [instanceNameDraft, setInstanceNameDraft] = useState(defaultInstanceName);
  const [feedback, setFeedback] = useState<FeedbackToastState | null>(null);
  const [testDestination, setTestDestination] = useState('');
  const [testMessage, setTestMessage] = useState('Mensagem teste enviada pelo TrackImob.');
  const [testMessageError, setTestMessageError] = useState<string | null>(null);
  const [isSendingTestMessage, setIsSendingTestMessage] = useState(false);
  const {
    connection,
    statusError,
    isStatusLoading,
    isConnecting,
    isRefreshingQr,
    isDisconnecting,
    refreshStatus,
    createConnection,
    loadConnectData,
    disconnectConnection,
  } = useWhatsAppConnection({
    defaultInstanceName,
  });
  const { groups, groupsError, isGroupsLoading, loadGroups } = useWhatsAppGroups(connection?.instanceName, {
    enabled: Boolean(connection?.instanceName && connection?.isConnected),
  });

  useEffect(() => {
    if (connection?.instanceName) {
      setInstanceNameDraft(connection.instanceName);
      return;
    }

    setInstanceNameDraft((currentValue) => (currentValue.trim().length > 0 ? currentValue : defaultInstanceName));
  }, [connection?.instanceName, defaultInstanceName]);

  const handleConnect = async () => {
    try {
      await createConnection(instanceNameDraft);
      setFeedback({
        title: 'Conexao iniciada',
        description: 'A instancia foi criada e o TrackImob buscou o QR Code mais recente.',
        variant: 'success',
      });
    } catch (error) {
      setFeedback({
        title: 'Nao foi possivel conectar',
        description: toFriendlyError(error, 'Revise a configuracao da API e tente novamente.'),
        variant: 'error',
      });
    }
  };

  const handleRefreshStatus = async () => {
    try {
      await refreshStatus();
      setFeedback({
        title: 'Status atualizado',
        description: 'Os dados mais recentes da instancia foram sincronizados com sucesso.',
        variant: 'info',
      });
    } catch (error) {
      setFeedback({
        title: 'Falha ao atualizar status',
        description: toFriendlyError(error, 'Nao foi possivel atualizar o status do WhatsApp.'),
        variant: 'error',
      });
    }
  };

  const handleRefreshQr = async () => {
    try {
      await loadConnectData(connection?.instanceName || instanceNameDraft);
      setFeedback({
        title: 'QR atualizado',
        description: 'Um novo QR Code foi buscado para a instancia ativa.',
        variant: 'info',
      });
    } catch (error) {
      setFeedback({
        title: 'Falha ao gerar QR',
        description: toFriendlyError(error, 'Nao foi possivel gerar um novo QR Code agora.'),
        variant: 'error',
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectConnection();
      setFeedback({
        title: 'Instancia desconectada',
        description: 'A conexao foi encerrada com sucesso e pode ser autenticada novamente a qualquer momento.',
        variant: 'success',
      });
    } catch (error) {
      setFeedback({
        title: 'Falha ao desconectar',
        description: toFriendlyError(error, 'Nao foi possivel desconectar a instancia neste momento.'),
        variant: 'error',
      });
    }
  };

  const handleSendTestMessage = async () => {
    if (!connection?.instanceName || !connection.isConnected) {
      setTestMessageError('Conecte uma instancia antes de enviar uma mensagem teste.');
      return;
    }

    if (!testDestination.trim()) {
      setTestMessageError('Informe um numero ou JID para validar o envio.');
      return;
    }

    if (!testMessage.trim()) {
      setTestMessageError('Digite a mensagem de teste antes de enviar.');
      return;
    }

    setIsSendingTestMessage(true);
    setTestMessageError(null);

    try {
      await sendWhatsAppTextMessage(connection.instanceName, {
        number: testDestination,
        text: testMessage,
      });
      setFeedback({
        title: 'Mensagem enviada',
        description: 'O backend confirmou o envio da mensagem teste para o destino informado.',
        variant: 'success',
      });
    } catch (error) {
      const friendlyError = toFriendlyError(error, 'Nao foi possivel enviar a mensagem teste.');
      setTestMessageError(friendlyError);
      setFeedback({
        title: 'Falha no envio',
        description: friendlyError,
        variant: 'error',
      });
    } finally {
      setIsSendingTestMessage(false);
    }
  };

  return (
    <main className="content-page whatsapp-page">
      <PageHeader
        title="WhatsApp"
        subtitle="Conecte a imobiliaria ao WhatsApp, gere QR Code, valide o envio com mensagens teste e acompanhe os grupos sincronizados pela Evolution API."
        actions={
          <div className="page-header__button-group">
            <Link to="/crm/conversas">
              <Button variant="secondary" icon={<ArrowUpRight size={16} aria-hidden="true" />}>
                Abrir conversas
              </Button>
            </Link>
          </div>
        }
      />

      {feedback ? (
        <div className="toast-stack">
          <Toast title={feedback.title} description={feedback.description} variant={feedback.variant} onClose={() => setFeedback(null)} />
        </div>
      ) : null}

      <section className="whatsapp-grid whatsapp-grid--main">
        <WhatsAppConnectionCard
          companyName={imobiliaria?.nome}
          connection={connection}
          instanceNameDraft={instanceNameDraft}
          error={statusError}
          isStatusLoading={isStatusLoading}
          isConnecting={isConnecting}
          isRefreshingQr={isRefreshingQr}
          isDisconnecting={isDisconnecting}
          onInstanceNameChange={setInstanceNameDraft}
          onConnect={handleConnect}
          onRefreshStatus={handleRefreshStatus}
          onRefreshQr={handleRefreshQr}
          onDisconnect={handleDisconnect}
        />

        <WhatsAppQRCodeCard
          connection={connection}
          isLoading={isRefreshingQr || (isStatusLoading && !connection)}
          error={null}
          onRefresh={handleRefreshQr}
        />
      </section>

      <section className="whatsapp-grid">
        <WhatsAppTestMessageCard
          connection={connection}
          destination={testDestination}
          message={testMessage}
          isSubmitting={isSendingTestMessage}
          error={testMessageError}
          onDestinationChange={setTestDestination}
          onMessageChange={setTestMessage}
          onSubmit={handleSendTestMessage}
        />

        <WhatsAppGroupsCard
          instanceName={connection?.instanceName}
          groups={groups}
          isLoading={isGroupsLoading}
          error={groupsError}
          onRefresh={() => {
            void loadGroups().catch(() => undefined);
          }}
          onUseGroup={(group) => {
            setTestDestination(group.id);
            setTestMessage((currentMessage) =>
              currentMessage.trim().length > 0 ? currentMessage : `Mensagem teste enviada para o grupo ${group.name}.`,
            );
            setFeedback({
              title: 'Grupo selecionado',
              description: `O JID ${group.id} foi preenchido no formulario de envio de mensagem.`,
              variant: 'info',
            });
          }}
        />
      </section>
    </main>
  );
}
