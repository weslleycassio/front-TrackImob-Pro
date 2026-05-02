import { MessageCircle, RefreshCw, Send } from 'lucide-react';
import type { WhatsAppConversationMessage, WhatsAppConversationSummary } from '../../types/whatsapp';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { Input } from '../ui/Input';
import { Skeleton } from '../ui/Skeleton';

type WhatsAppConversationShellProps = {
  conversations: WhatsAppConversationSummary[];
  selectedConversationId: string | null;
  messages: WhatsAppConversationMessage[];
  draftMessage: string;
  isConnected: boolean;
  isPreviewMode: boolean;
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  isSendingMessage: boolean;
  searchTerm: string;
  unreadOnly: boolean;
  error?: string | null;
  onSelectConversation: (conversationId: string) => void;
  onDraftMessageChange: (value: string) => void;
  onSendMessage: () => void;
  onSearchTermChange: (value: string) => void;
  onToggleUnreadOnly: () => void;
  onRefreshConversations: () => void;
};

function getSelectedConversation(conversations: WhatsAppConversationSummary[], selectedConversationId: string | null) {
  return conversations.find((conversation) => conversation.id === selectedConversationId) ?? null;
}

function formatTime(value: string) {
  const parsedValue = new Date(value);

  if (Number.isNaN(parsedValue.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsedValue);
}

function getChannelLabel(channel: WhatsAppConversationSummary['channel']) {
  return channel === 'group' ? 'WhatsApp grupo' : 'WhatsApp individual';
}

export function WhatsAppConversationShell({
  conversations,
  selectedConversationId,
  messages,
  draftMessage,
  isConnected,
  isPreviewMode,
  isLoadingConversations,
  isLoadingMessages,
  isSendingMessage,
  searchTerm,
  unreadOnly,
  error,
  onSelectConversation,
  onDraftMessageChange,
  onSendMessage,
  onSearchTermChange,
  onToggleUnreadOnly,
  onRefreshConversations,
}: WhatsAppConversationShellProps) {
  const selectedConversation = getSelectedConversation(conversations, selectedConversationId);

  return (
    <Card
      className="whatsapp-chat-card"
      title="Conversas do CRM"
      subtitle={
        isPreviewMode
          ? 'Modo preview ativo enquanto o backend ainda nao publica o inbox real. A estrutura ja esta pronta para a integracao.'
          : 'Inbox conectado ao backend para historico real, leitura de mensagens e evolucao da operacao comercial.'
      }
      actions={<Badge variant={isPreviewMode ? 'warning' : 'success'}>{isPreviewMode ? 'Preview local' : 'Inbox conectado'}</Badge>}
    >
      {error ? <div className="global-error">{error}</div> : null}

      {!isConnected ? (
        <EmptyState
          title="Conecte o WhatsApp para abrir o chat"
          description="A tela de conversas depende da instancia autenticada. Assim que houver conexao, o inbox comercial fica disponivel."
        />
      ) : (
        <div className="whatsapp-chat-shell">
          <aside className="whatsapp-chat-sidebar">
            <div className="whatsapp-chat-sidebar__header">
              <h3>Conversas</h3>
              <span>{conversations.length} abertas</span>
            </div>

            <div className="whatsapp-chat-sidebar__filters">
              <Input
                id="whatsapp-chat-search"
                label="Buscar conversas"
                value={searchTerm}
                placeholder="Nome, telefone, grupo ou lead"
                onChange={(event) => onSearchTermChange(event.target.value)}
              />

              <div className="whatsapp-chat-sidebar__filters-actions">
                <Button variant={unreadOnly ? 'primary' : 'secondary'} size="sm" onClick={onToggleUnreadOnly}>
                  {unreadOnly ? 'Somente nao lidas' : 'Mostrar nao lidas'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<RefreshCw size={16} aria-hidden="true" />}
                  onClick={onRefreshConversations}
                  disabled={isLoadingConversations}
                >
                  {isLoadingConversations ? 'Atualizando...' : 'Atualizar inbox'}
                </Button>
              </div>

              <span className="ui-field__hint">
                {isPreviewMode
                  ? 'Enquanto os endpoints do inbox nao existirem, o front usa uma estrutura local para manter a navegacao validada.'
                  : 'As conversas exibidas aqui vieram do backend da imobiliaria e podem ser filtradas localmente.'}
              </span>
            </div>

            <div className="whatsapp-chat-sidebar__list">
              {isLoadingConversations ? (
                <>
                  <Skeleton height={92} />
                  <Skeleton height={92} />
                  <Skeleton height={92} />
                </>
              ) : null}

              {!isLoadingConversations && conversations.length === 0 ? (
                <EmptyState
                  title="Nenhuma conversa encontrada"
                  description={
                    searchTerm.trim().length > 0 || unreadOnly
                      ? 'Ajuste os filtros para encontrar outro contato ou grupo.'
                      : 'Quando a instancia receber conversas reais, elas aparecerao aqui automaticamente.'
                  }
                />
              ) : null}

              {!isLoadingConversations
                ? conversations.map((conversation) => {
                    const isActive = conversation.id === selectedConversationId;

                    return (
                      <button
                        key={conversation.id}
                        type="button"
                        className={['whatsapp-chat-conversation', isActive ? 'whatsapp-chat-conversation--active' : '']
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => onSelectConversation(conversation.id)}
                      >
                        <span className="whatsapp-chat-conversation__avatar" aria-hidden="true">
                          {conversation.avatar}
                        </span>

                        <span className="whatsapp-chat-conversation__copy">
                          <span className="whatsapp-chat-conversation__topline">
                            <strong>{conversation.name}</strong>
                            <small>{formatTime(conversation.lastMessageAt)}</small>
                          </span>
                          <span className="whatsapp-chat-conversation__meta">
                            <span>{conversation.subtitle}</span>
                            <span>{getChannelLabel(conversation.channel)}</span>
                          </span>
                          <span className="whatsapp-chat-conversation__message">{conversation.lastMessage}</span>
                        </span>

                        {conversation.unreadCount > 0 ? <span className="whatsapp-chat-conversation__unread">{conversation.unreadCount}</span> : null}
                      </button>
                    );
                  })
                : null}
            </div>
          </aside>

          <section className="whatsapp-chat-thread">
            {selectedConversation ? (
              <>
                <header className="whatsapp-chat-thread__header">
                  <div className="whatsapp-chat-thread__identity">
                    <span className="whatsapp-chat-thread__avatar" aria-hidden="true">
                      {selectedConversation.avatar}
                    </span>
                    <div>
                      <strong>{selectedConversation.name}</strong>
                      <p>
                        {getChannelLabel(selectedConversation.channel)}{' '}
                        {selectedConversation.online ? '• online' : '• ultima atividade recente'}
                      </p>
                    </div>
                  </div>

                  <div className="whatsapp-chat-thread__header-actions">
                    {selectedConversation.leadName ? <Badge variant="info">Lead: {selectedConversation.leadName}</Badge> : null}
                    <Button variant="secondary" size="sm" icon={<MessageCircle size={16} aria-hidden="true" />}>
                      Vincular ao CRM
                    </Button>
                  </div>
                </header>

                <div className="whatsapp-chat-thread__messages">
                  {isLoadingMessages ? (
                    <>
                      <Skeleton height={68} className="whatsapp-chat-bubble whatsapp-chat-bubble--in" />
                      <Skeleton height={68} className="whatsapp-chat-bubble whatsapp-chat-bubble--out" />
                      <Skeleton height={48} className="whatsapp-chat-bubble whatsapp-chat-bubble--system" />
                    </>
                  ) : null}

                  {!isLoadingMessages && messages.length === 0 ? (
                    <EmptyState
                      title="Nenhuma mensagem carregada"
                      description="Assim que o backend devolver o historico da conversa, as mensagens aparecerao nesta coluna."
                    />
                  ) : null}

                  {!isLoadingMessages
                    ? messages.map((message) => (
                        <article
                          key={message.id}
                          className={[
                            'whatsapp-chat-bubble',
                            message.direction === 'out'
                              ? 'whatsapp-chat-bubble--out'
                              : message.direction === 'system'
                                ? 'whatsapp-chat-bubble--system'
                                : 'whatsapp-chat-bubble--in',
                          ].join(' ')}
                        >
                          {message.authorName && message.direction !== 'system' ? (
                            <strong className="whatsapp-chat-bubble__author">{message.authorName}</strong>
                          ) : null}
                          <p>{message.text}</p>
                          <span>{formatTime(message.timestamp)}</span>
                        </article>
                      ))
                    : null}
                </div>

                <div className="whatsapp-chat-thread__composer">
                  <textarea
                    value={draftMessage}
                    placeholder="Responder no WhatsApp..."
                    onChange={(event) => onDraftMessageChange(event.target.value)}
                  />
                  <div className="whatsapp-chat-thread__composer-actions">
                    <span className="ui-field__hint">
                      {isPreviewMode
                        ? 'O envio funciona localmente neste modo de preview. Quando o backend do inbox entrar, este mesmo fluxo passa a enviar mensagens reais.'
                        : 'As mensagens digitadas aqui usam o endpoint de envio da conversa selecionada.'}
                    </span>
                    <Button
                      icon={<Send size={16} aria-hidden="true" />}
                      onClick={onSendMessage}
                      disabled={!draftMessage.trim() || isSendingMessage}
                    >
                      {isSendingMessage ? 'Enviando...' : 'Enviar'}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <EmptyState
                title="Selecione uma conversa"
                description="Escolha um contato ou grupo na lista lateral para abrir o chat desta conversa."
              />
            )}
          </section>
        </div>
      )}
    </Card>
  );
}
