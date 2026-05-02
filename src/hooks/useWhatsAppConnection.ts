import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createWhatsAppConnection,
  disconnectWhatsAppConnection,
  getWhatsAppConnectionConnectData,
  getWhatsAppConnectionStatus,
} from '../services/whatsappService';
import type { WhatsAppConnection } from '../types/whatsapp';
import { toFriendlyError } from '../utils/errorMessages';

function normalizeInstanceName(value?: string | null) {
  return value?.trim() ? value.trim() : '';
}

function mergeConnection(
  currentConnection: WhatsAppConnection | null,
  nextConnection: WhatsAppConnection | null,
  fallbackInstanceName = '',
): WhatsAppConnection | null {
  if (!currentConnection && !nextConnection && !fallbackInstanceName) {
    return null;
  }

  return {
    instanceName: nextConnection?.instanceName || currentConnection?.instanceName || fallbackInstanceName,
    status: nextConnection?.status || currentConnection?.status || 'PENDING',
    connectedNumber:
      nextConnection?.connectedNumber !== null && nextConnection?.connectedNumber !== undefined
        ? nextConnection.connectedNumber
        : currentConnection?.connectedNumber ?? null,
    qrCodeBase64:
      nextConnection?.qrCodeBase64 !== null && nextConnection?.qrCodeBase64 !== undefined
        ? nextConnection.qrCodeBase64
        : currentConnection?.qrCodeBase64 ?? null,
    pairingCode:
      nextConnection?.pairingCode !== null && nextConnection?.pairingCode !== undefined
        ? nextConnection.pairingCode
        : currentConnection?.pairingCode ?? null,
    profileName:
      nextConnection?.profileName !== null && nextConnection?.profileName !== undefined
        ? nextConnection.profileName
        : currentConnection?.profileName ?? null,
    serverUrl:
      nextConnection?.serverUrl !== null && nextConnection?.serverUrl !== undefined
        ? nextConnection.serverUrl
        : currentConnection?.serverUrl ?? null,
    lastError:
      nextConnection?.lastError !== null && nextConnection?.lastError !== undefined
        ? nextConnection.lastError
        : currentConnection?.lastError ?? null,
    updatedAt:
      nextConnection?.updatedAt !== null && nextConnection?.updatedAt !== undefined
        ? nextConnection.updatedAt
        : currentConnection?.updatedAt ?? null,
    isConnected: nextConnection?.isConnected ?? currentConnection?.isConnected ?? false,
  };
}

type UseWhatsAppConnectionOptions = {
  defaultInstanceName?: string;
  shouldPoll?: boolean;
};

export function useWhatsAppConnection({ defaultInstanceName = '', shouldPoll = true }: UseWhatsAppConnectionOptions = {}) {
  const [connection, setConnection] = useState<WhatsAppConnection | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isStatusLoading, setIsStatusLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRefreshingQr, setIsRefreshingQr] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const fallbackInstanceName = useMemo(() => normalizeInstanceName(defaultInstanceName), [defaultInstanceName]);

  const refreshStatus = useCallback(
    async (options?: { silent?: boolean }) => {
      const preferredInstanceName = connection?.instanceName || fallbackInstanceName;

      if (!options?.silent) {
        setIsStatusLoading(true);
      }

      try {
        const nextConnection = await getWhatsAppConnectionStatus(preferredInstanceName);
        setConnection((currentConnection) => mergeConnection(currentConnection, nextConnection, fallbackInstanceName));
        setStatusError(null);
        return nextConnection;
      } catch (error) {
        const friendlyError = toFriendlyError(error, 'Nao foi possivel carregar o status do WhatsApp.');
        setStatusError(friendlyError);
        throw error;
      } finally {
        if (!options?.silent) {
          setIsStatusLoading(false);
        }
      }
    },
    [connection?.instanceName, fallbackInstanceName],
  );

  const loadConnectData = useCallback(
    async (instanceName?: string, options?: { silent?: boolean }) => {
      const targetInstanceName = normalizeInstanceName(instanceName) || connection?.instanceName || fallbackInstanceName;

      if (!targetInstanceName) {
        return null;
      }

      if (!options?.silent) {
        setIsRefreshingQr(true);
      }

      try {
        const connectData = await getWhatsAppConnectionConnectData(targetInstanceName);
        setConnection((currentConnection) => mergeConnection(currentConnection, connectData, targetInstanceName));
        setStatusError(null);
        return connectData;
      } catch (error) {
        const friendlyError = toFriendlyError(error, 'Nao foi possivel carregar o QR Code desta instancia.');
        setStatusError(friendlyError);
        throw error;
      } finally {
        if (!options?.silent) {
          setIsRefreshingQr(false);
        }
      }
    },
    [connection?.instanceName, fallbackInstanceName],
  );

  const createConnection = useCallback(
    async (instanceName?: string) => {
      const requestedInstanceName = normalizeInstanceName(instanceName) || connection?.instanceName || fallbackInstanceName;
      setIsConnecting(true);

      try {
        const createdConnection = await createWhatsAppConnection({ instanceName: requestedInstanceName || undefined });
        const targetInstanceName = createdConnection.instanceName || requestedInstanceName;
        setConnection((currentConnection) => mergeConnection(currentConnection, createdConnection, targetInstanceName));

        if (targetInstanceName) {
          try {
            const connectData = await getWhatsAppConnectionConnectData(targetInstanceName);
            setConnection((currentConnection) => mergeConnection(currentConnection, connectData, targetInstanceName));
          } catch {
            // A criacao pode ter funcionado mesmo se o endpoint de connect ainda nao estiver pronto.
          }

          try {
            const freshStatus = await getWhatsAppConnectionStatus(targetInstanceName);
            setConnection((currentConnection) => mergeConnection(currentConnection, freshStatus, targetInstanceName));
          } catch {
            // O status sera buscado novamente pelo refresh manual/polling.
          }
        }

        setStatusError(null);
        return createdConnection;
      } catch (error) {
        const friendlyError = toFriendlyError(error, 'Nao foi possivel iniciar a conexao do WhatsApp.');
        setStatusError(friendlyError);
        throw error;
      } finally {
        setIsConnecting(false);
      }
    },
    [connection?.instanceName, fallbackInstanceName],
  );

  const disconnectConnection = useCallback(async () => {
    const targetInstanceName = connection?.instanceName || fallbackInstanceName;

    if (!targetInstanceName) {
      throw new Error('Nenhuma instancia disponivel para desconectar.');
    }

    setIsDisconnecting(true);

    try {
      const disconnectedConnection = await disconnectWhatsAppConnection(targetInstanceName);
      setConnection((currentConnection) =>
        mergeConnection(
          currentConnection,
          disconnectedConnection
            ? {
                ...disconnectedConnection,
                status: disconnectedConnection.status || 'DISCONNECTED',
                isConnected: false,
                qrCodeBase64: null,
                pairingCode: null,
                connectedNumber: null,
              }
            : {
                instanceName: targetInstanceName,
                status: 'DISCONNECTED',
                connectedNumber: null,
                qrCodeBase64: null,
                pairingCode: null,
                profileName: null,
                serverUrl: null,
                lastError: null,
                updatedAt: null,
                isConnected: false,
              },
          targetInstanceName,
        ),
      );
      setStatusError(null);
      return disconnectedConnection;
    } catch (error) {
      const friendlyError = toFriendlyError(error, 'Nao foi possivel desconectar esta instancia.');
      setStatusError(friendlyError);
      throw error;
    } finally {
      setIsDisconnecting(false);
    }
  }, [connection?.instanceName, fallbackInstanceName]);

  useEffect(() => {
    void refreshStatus().catch(() => undefined);
  }, [refreshStatus]);

  useEffect(() => {
    if (!shouldPoll || !connection?.instanceName || connection.isConnected) {
      return undefined;
    }

    const pollingInterval = window.setInterval(() => {
      void refreshStatus({ silent: true }).catch(() => undefined);
      void loadConnectData(connection.instanceName, { silent: true }).catch(() => undefined);
    }, 15000);

    return () => window.clearInterval(pollingInterval);
  }, [connection?.instanceName, connection?.isConnected, loadConnectData, refreshStatus, shouldPoll]);

  return {
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
    setConnection,
  };
}
