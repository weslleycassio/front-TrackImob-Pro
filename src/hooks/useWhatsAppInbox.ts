import { useCallback, useEffect, useState } from 'react';
import {
  getWhatsAppConversationMessages,
  getWhatsAppConversations,
  isWhatsAppMissingEndpointError,
  markWhatsAppConversationRead,
  sendWhatsAppConversationMessage,
} from '../services/whatsappService';
import type {
  ListWhatsAppConversationsParams,
  SendWhatsAppConversationMessagePayload,
  WhatsAppConversationMessage,
  WhatsAppConversationSummary,
} from '../types/whatsapp';
import { toFriendlyError } from '../utils/errorMessages';

type WhatsAppInboxMode = 'live' | 'preview';

type UseWhatsAppInboxOptions = {
  enabled?: boolean;
  selectedConversationId?: string | null;
};

export function useWhatsAppInbox({ enabled = true, selectedConversationId = null }: UseWhatsAppInboxOptions = {}) {
  const [mode, setMode] = useState<WhatsAppInboxMode>('live');
  const [conversations, setConversations] = useState<WhatsAppConversationSummary[]>([]);
  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, WhatsAppConversationMessage[]>>({});
  const [conversationsError, setConversationsError] = useState<string | null>(null);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [isConversationsLoading, setIsConversationsLoading] = useState(false);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const markConversationAsRead = useCallback(
    async (conversationId: string) => {
      if (!enabled || mode === 'preview' || !conversationId.trim()) {
        return;
      }

      setConversations((currentConversations) =>
        currentConversations.map((conversation) =>
          conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation,
        ),
      );

      try {
        await markWhatsAppConversationRead(conversationId);
      } catch {
        // O estado local ja foi atualizado para manter a UX responsiva.
      }
    },
    [enabled, mode],
  );

  const loadConversations = useCallback(
    async (params: ListWhatsAppConversationsParams = {}) => {
      if (!enabled) {
        setConversations([]);
        setConversationsError(null);
        return [];
      }

      setIsConversationsLoading(true);

      try {
        const nextConversations = await getWhatsAppConversations(params);
        setMode('live');
        setConversations(nextConversations);
        setConversationsError(null);
        return nextConversations;
      } catch (error) {
        if (isWhatsAppMissingEndpointError(error)) {
          setMode('preview');
          setConversations([]);
          setConversationsError(null);
          return [];
        }

        setMode('live');
        setConversationsError(toFriendlyError(error, 'Nao foi possivel carregar as conversas do WhatsApp.'));
        throw error;
      } finally {
        setIsConversationsLoading(false);
      }
    },
    [enabled],
  );

  const loadMessages = useCallback(
    async (conversationId: string, options?: { silent?: boolean }) => {
      if (!enabled || mode === 'preview' || !conversationId.trim()) {
        return [];
      }

      if (!options?.silent) {
        setIsMessagesLoading(true);
      }

      try {
        const nextMessages = await getWhatsAppConversationMessages(conversationId);
        setMessagesByConversation((currentMessages) => ({
          ...currentMessages,
          [conversationId]: nextMessages,
        }));
        setMessagesError(null);
        void markConversationAsRead(conversationId);
        return nextMessages;
      } catch (error) {
        if (isWhatsAppMissingEndpointError(error)) {
          setMode('preview');
          setMessagesError(null);
          return [];
        }

        setMessagesError(toFriendlyError(error, 'Nao foi possivel carregar as mensagens desta conversa.'));
        throw error;
      } finally {
        if (!options?.silent) {
          setIsMessagesLoading(false);
        }
      }
    },
    [enabled, markConversationAsRead, mode],
  );

  const sendMessage = useCallback(
    async (conversationId: string, payload: SendWhatsAppConversationMessagePayload) => {
      if (!enabled || mode === 'preview' || !conversationId.trim() || !payload.text.trim()) {
        return null;
      }

      const optimisticTimestamp = new Date().toISOString();
      const optimisticMessage: WhatsAppConversationMessage = {
        id: `optimistic-${conversationId}-${Date.now()}`,
        direction: 'out',
        text: payload.text.trim(),
        timestamp: optimisticTimestamp,
        status: 'PENDING',
        authorName: null,
      };

      setIsSendingMessage(true);
      setMessagesByConversation((currentMessages) => ({
        ...currentMessages,
        [conversationId]: [...(currentMessages[conversationId] ?? []), optimisticMessage],
      }));
      setConversations((currentConversations) =>
        currentConversations.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                lastMessage: optimisticMessage.text,
                lastMessageAt: optimisticTimestamp,
              }
            : conversation,
        ),
      );

      try {
        const sentMessage = await sendWhatsAppConversationMessage(conversationId, payload);
        const nextMessage = sentMessage ?? { ...optimisticMessage, status: 'SENT' };

        setMessagesByConversation((currentMessages) => ({
          ...currentMessages,
          [conversationId]: (currentMessages[conversationId] ?? []).map((message) =>
            message.id === optimisticMessage.id ? nextMessage : message,
          ),
        }));
        setMessagesError(null);
        return nextMessage;
      } catch (error) {
        setMessagesError(toFriendlyError(error, 'Nao foi possivel enviar a mensagem desta conversa.'));
        setMessagesByConversation((currentMessages) => ({
          ...currentMessages,
          [conversationId]: (currentMessages[conversationId] ?? []).map((message) =>
            message.id === optimisticMessage.id ? { ...message, status: 'ERROR' } : message,
          ),
        }));
        throw error;
      } finally {
        setIsSendingMessage(false);
      }
    },
    [enabled, mode],
  );

  useEffect(() => {
    if (!enabled) {
      setMode('live');
      setConversations([]);
      setMessagesByConversation({});
      setConversationsError(null);
      setMessagesError(null);
      setIsConversationsLoading(false);
      setIsMessagesLoading(false);
      setIsSendingMessage(false);
      return;
    }

    void loadConversations().catch(() => undefined);
  }, [enabled, loadConversations]);

  useEffect(() => {
    if (!enabled || mode === 'preview' || !selectedConversationId) {
      return;
    }

    if (messagesByConversation[selectedConversationId]) {
      void markConversationAsRead(selectedConversationId);
      return;
    }

    void loadMessages(selectedConversationId).catch(() => undefined);
  }, [enabled, loadMessages, markConversationAsRead, messagesByConversation, mode, selectedConversationId]);

  return {
    mode,
    conversations,
    messagesByConversation,
    conversationsError,
    messagesError,
    isConversationsLoading,
    isMessagesLoading,
    isSendingMessage,
    loadConversations,
    loadMessages,
    sendMessage,
    markConversationAsRead,
  };
}
