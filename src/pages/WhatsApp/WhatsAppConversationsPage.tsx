import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useImobiliaria } from '../../hooks/useImobiliaria';
import { useWhatsAppConnection } from '../../hooks/useWhatsAppConnection';
import { useWhatsAppGroups } from '../../hooks/useWhatsAppGroups';
import { useWhatsAppInbox } from '../../hooks/useWhatsAppInbox';
import { WhatsAppConversationShell } from '../../components/whatsapp/WhatsAppConversationShell';
import { WhatsAppStatusBadge } from '../../components/whatsapp/WhatsAppStatusBadge';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { Toast } from '../../components/ui/Toast';
import type { WhatsAppConversationMessage, WhatsAppConversationSummary } from '../../types/whatsapp';
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

function getStaticConversations(): WhatsAppConversationSummary[] {
  return [
    {
      id: 'lead-larissa',
      name: 'Larissa Souza',
      subtitle: 'Lead do portal',
      channel: 'individual',
      avatar: 'LS',
      unreadCount: 2,
      lastMessage: 'Consegue agendar visita para amanha?',
      lastMessageAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      online: true,
      phoneNumber: '5511999999999',
      jid: '5511999999999@s.whatsapp.net',
      assignedTo: 'Time comercial',
      leadName: 'Larissa Souza',
      isGroup: false,
    },
    {
      id: 'lead-marcos',
      name: 'Marcos Oliveira',
      subtitle: 'Investidor',
      channel: 'individual',
      avatar: 'MO',
      unreadCount: 0,
      lastMessage: 'Pode me enviar as condicoes de pagamento?',
      lastMessageAt: new Date(Date.now() - 1000 * 60 * 54).toISOString(),
      phoneNumber: '5511988887777',
      jid: '5511988887777@s.whatsapp.net',
      assignedTo: 'Time comercial',
      leadName: 'Marcos Oliveira',
      isGroup: false,
    },
  ];
}

function buildGroupConversations(groupName: string, groupId: string, index: number): WhatsAppConversationSummary {
  return {
    id: `group-${groupId}`,
    name: groupName,
    subtitle: 'Grupo sincronizado',
    channel: 'group',
    avatar: 'GR',
    unreadCount: index === 0 ? 4 : 0,
    lastMessage: 'Estrutura pronta para receber historico real da API.',
    lastMessageAt: new Date(Date.now() - index * 1000 * 60 * 15).toISOString(),
    phoneNumber: null,
    jid: groupId,
    assignedTo: null,
    leadName: null,
    isGroup: true,
  };
}

function buildSeedMessages(conversation: WhatsAppConversationSummary): WhatsAppConversationMessage[] {
  return [
    {
      id: `${conversation.id}-welcome`,
      direction: 'system',
      text: `Estrutura local pronta para integrar o historico real da conversa ${conversation.name}.`,
      timestamp: new Date().toISOString(),
      status: null,
      authorName: null,
    },
    {
      id: `${conversation.id}-incoming`,
      direction: 'in',
      text:
        conversation.channel === 'group'
          ? 'Assim que o backend expuser o historico, as mensagens do grupo entram aqui automaticamente.'
          : 'Oi! Quero continuar o atendimento pelo WhatsApp.',
      timestamp: new Date(Date.now() - 1000 * 60 * 22).toISOString(),
      status: null,
      authorName: conversation.channel === 'group' ? 'Equipe comercial' : conversation.name,
    },
    {
      id: `${conversation.id}-outgoing`,
      direction: 'out',
      text:
        conversation.channel === 'group'
          ? 'Perfeito. Esta area ja esta preparada para CRM, anotacoes e automacoes futuras.'
          : 'Perfeito! Ja deixei a estrutura do inbox pronta para integrar o CRM.',
      timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
      status: 'SENT',
      authorName: null,
    },
  ];
}

function syncPreviewConversations(
  currentConversations: WhatsAppConversationSummary[],
  nextConversations: WhatsAppConversationSummary[],
) {
  const currentConversationMap = new Map(currentConversations.map((conversation) => [conversation.id, conversation]));

  return nextConversations.map((conversation) => {
    const currentConversation = currentConversationMap.get(conversation.id);

    if (!currentConversation) {
      return conversation;
    }

    return {
      ...conversation,
      unreadCount: currentConversation.unreadCount,
      lastMessage: currentConversation.lastMessage,
      lastMessageAt: currentConversation.lastMessageAt,
      online: currentConversation.online ?? conversation.online,
      assignedTo: currentConversation.assignedTo,
      leadName: currentConversation.leadName,
    };
  });
}

function filterConversations(
  conversations: WhatsAppConversationSummary[],
  searchTerm: string,
  unreadOnly: boolean,
) {
  const normalizedSearch = searchTerm.trim().toLowerCase();

  return conversations.filter((conversation) => {
    if (unreadOnly && conversation.unreadCount === 0) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    return [
      conversation.name,
      conversation.subtitle,
      conversation.lastMessage,
      conversation.phoneNumber ?? '',
      conversation.jid ?? '',
      conversation.leadName ?? '',
    ]
      .join(' ')
      .toLowerCase()
      .includes(normalizedSearch);
  });
}

export function WhatsAppConversationsPage() {
  const { imobiliaria } = useImobiliaria();
  const defaultInstanceName = useMemo(() => slugifyInstanceName(imobiliaria?.nome), [imobiliaria?.nome]);
  const [feedback, setFeedback] = useState<FeedbackToastState | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [draftMessage, setDraftMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [previewConversations, setPreviewConversations] = useState<WhatsAppConversationSummary[]>([]);
  const [previewMessagesByConversation, setPreviewMessagesByConversation] = useState<Record<string, WhatsAppConversationMessage[]>>({});
  const { connection, isStatusLoading, refreshStatus } = useWhatsAppConnection({
    defaultInstanceName,
  });
  const { groups } = useWhatsAppGroups(connection?.instanceName, {
    enabled: Boolean(connection?.instanceName && connection.isConnected),
  });
  const {
    mode,
    conversations: liveConversations,
    messagesByConversation: liveMessagesByConversation,
    conversationsError,
    messagesError,
    isConversationsLoading,
    isMessagesLoading,
    isSendingMessage,
    loadConversations,
    loadMessages,
    sendMessage,
  } = useWhatsAppInbox({
    enabled: Boolean(connection?.instanceName && connection.isConnected),
    selectedConversationId,
  });

  const previewBaseConversations = useMemo(() => {
    const staticConversations = getStaticConversations();
    const groupConversations = groups.slice(0, 6).map((group, index) => buildGroupConversations(group.name, group.id, index));
    return [...staticConversations, ...groupConversations];
  }, [groups]);

  useEffect(() => {
    setPreviewConversations((currentConversations) => syncPreviewConversations(currentConversations, previewBaseConversations));
  }, [previewBaseConversations]);

  useEffect(() => {
    setPreviewMessagesByConversation((currentMessages) => {
      const nextMessages = { ...currentMessages };

      previewConversations.forEach((conversation) => {
        if (!nextMessages[conversation.id]) {
          nextMessages[conversation.id] = buildSeedMessages(conversation);
        }
      });

      return nextMessages;
    });
  }, [previewConversations]);

  const sourceConversations = mode === 'live' ? liveConversations : previewConversations;
  const filteredConversations = useMemo(
    () => filterConversations(sourceConversations, searchTerm, unreadOnly),
    [searchTerm, sourceConversations, unreadOnly],
  );

  useEffect(() => {
    if (filteredConversations.length === 0) {
      setSelectedConversationId(null);
      return;
    }

    setSelectedConversationId((currentConversationId) =>
      currentConversationId && filteredConversations.some((conversation) => conversation.id === currentConversationId)
        ? currentConversationId
        : filteredConversations[0].id,
    );
  }, [filteredConversations]);

  const activeMessages = selectedConversationId
    ? mode === 'live'
      ? liveMessagesByConversation[selectedConversationId] ?? []
      : previewMessagesByConversation[selectedConversationId] ?? []
    : [];

  const handleRefreshInbox = async () => {
    if (!connection?.isConnected) {
      setFeedback({
        title: 'Conecte a instancia primeiro',
        description: 'O inbox depende de uma conexao ativa para sincronizar conversas reais.',
        variant: 'info',
      });
      return;
    }

    try {
      const nextConversations = await loadConversations();

      if (selectedConversationId && nextConversations.some((conversation) => conversation.id === selectedConversationId)) {
        await loadMessages(selectedConversationId, { silent: true });
      }

      setFeedback({
        title: 'Inbox atualizado',
        description:
          nextConversations.length > 0
            ? 'As conversas e o historico da conversa ativa foram sincronizados com sucesso.'
            : 'Sincronizacao concluida. Se o inbox continuar em preview, os endpoints reais ainda nao foram publicados pelo backend.',
        variant: nextConversations.length > 0 ? 'success' : 'info',
      });
    } catch (error) {
      setFeedback({
        title: 'Falha ao atualizar inbox',
        description: toFriendlyError(error, 'Nao foi possivel sincronizar as conversas do WhatsApp agora.'),
        variant: 'error',
      });
    }
  };

  const handleSendMessage = async () => {
    if (!selectedConversationId || !draftMessage.trim()) {
      return;
    }

    const trimmedDraftMessage = draftMessage.trim();

    if (mode === 'preview') {
      const nextTimestamp = new Date().toISOString();
      const previewMessage: WhatsAppConversationMessage = {
        id: `${selectedConversationId}-${Date.now()}`,
        direction: 'out',
        text: trimmedDraftMessage,
        timestamp: nextTimestamp,
        status: 'SENT',
        authorName: null,
      };

      setPreviewMessagesByConversation((currentMessages) => ({
        ...currentMessages,
        [selectedConversationId]: [...(currentMessages[selectedConversationId] ?? []), previewMessage],
      }));
      setPreviewConversations((currentConversations) =>
        currentConversations.map((conversation) =>
          conversation.id === selectedConversationId
            ? {
                ...conversation,
                unreadCount: 0,
                lastMessage: trimmedDraftMessage,
                lastMessageAt: nextTimestamp,
              }
            : conversation,
        ),
      );
      setDraftMessage('');
      setFeedback({
        title: 'Mensagem adicionada no preview',
        description: 'O inbox local recebeu a nova mensagem e segue pronto para trocar pelo envio real assim que o backend estiver disponivel.',
        variant: 'success',
      });
      return;
    }

    try {
      await sendMessage(selectedConversationId, {
        text: trimmedDraftMessage,
      });
      setDraftMessage('');
      setFeedback({
        title: 'Mensagem enviada',
        description: 'O backend confirmou o envio pela conversa selecionada.',
        variant: 'success',
      });
    } catch (error) {
      setFeedback({
        title: 'Falha no envio',
        description: toFriendlyError(error, 'Nao foi possivel enviar a mensagem desta conversa.'),
        variant: 'error',
      });
    }
  };

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setDraftMessage('');

    if (mode === 'preview') {
      setPreviewConversations((currentConversations) =>
        currentConversations.map((conversation) =>
          conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation,
        ),
      );
    }
  };

  return (
    <main className="content-page whatsapp-page">
      <PageHeader
        title="Conversas"
        subtitle="Inbox em estilo WhatsApp pronto para evoluir com historico real, distribuicao comercial e vinculacao direta com leads do CRM."
        actions={
          <div className="page-header__button-group">
            <Button
              variant="secondary"
              icon={<RefreshCw size={16} aria-hidden="true" />}
              onClick={() => {
                void refreshStatus().catch(() => undefined);
              }}
              disabled={isStatusLoading}
            >
              {isStatusLoading ? 'Atualizando...' : 'Atualizar status'}
            </Button>
            <Link to="/configuracoes/whatsapp">
              <Button variant="secondary" icon={<ArrowUpRight size={16} aria-hidden="true" />}>
                Configurar WhatsApp
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

      <section className="whatsapp-chat-status">
        <div>
          <span className="whatsapp-chat-status__eyebrow">Instancia ativa</span>
          <strong>{connection?.instanceName || defaultInstanceName}</strong>
          <p>{connection?.connectedNumber || 'Numero ainda nao conectado'}</p>
        </div>
        <WhatsAppStatusBadge status={connection?.status} />
      </section>

      <WhatsAppConversationShell
        conversations={filteredConversations}
        selectedConversationId={selectedConversationId}
        messages={activeMessages}
        draftMessage={draftMessage}
        isConnected={Boolean(connection?.isConnected)}
        isPreviewMode={mode === 'preview'}
        isLoadingConversations={mode === 'live' ? isConversationsLoading : false}
        isLoadingMessages={mode === 'live' ? isMessagesLoading : false}
        isSendingMessage={mode === 'live' ? isSendingMessage : false}
        searchTerm={searchTerm}
        unreadOnly={unreadOnly}
        error={mode === 'live' ? conversationsError ?? messagesError : null}
        onSelectConversation={handleSelectConversation}
        onDraftMessageChange={setDraftMessage}
        onSendMessage={() => {
          void handleSendMessage();
        }}
        onSearchTermChange={setSearchTerm}
        onToggleUnreadOnly={() => setUnreadOnly((currentValue) => !currentValue)}
        onRefreshConversations={() => {
          void handleRefreshInbox();
        }}
      />
    </main>
  );
}
