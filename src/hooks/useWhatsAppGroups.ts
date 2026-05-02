import { useCallback, useEffect, useState } from 'react';
import { getWhatsAppGroups } from '../services/whatsappService';
import type { WhatsAppGroup } from '../types/whatsapp';
import { toFriendlyError } from '../utils/errorMessages';

type UseWhatsAppGroupsOptions = {
  enabled?: boolean;
};

export function useWhatsAppGroups(instanceName?: string | null, { enabled = true }: UseWhatsAppGroupsOptions = {}) {
  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [isGroupsLoading, setIsGroupsLoading] = useState(false);

  const loadGroups = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!instanceName?.trim()) {
        setGroups([]);
        setGroupsError(null);
        return [];
      }

      if (!options?.silent) {
        setIsGroupsLoading(true);
      }

      try {
        const nextGroups = await getWhatsAppGroups(instanceName.trim());
        setGroups(nextGroups);
        setGroupsError(null);
        return nextGroups;
      } catch (error) {
        const friendlyError = toFriendlyError(error, 'Nao foi possivel carregar os grupos desta instancia.');
        setGroupsError(friendlyError);
        throw error;
      } finally {
        if (!options?.silent) {
          setIsGroupsLoading(false);
        }
      }
    },
    [instanceName],
  );

  useEffect(() => {
    if (!enabled || !instanceName?.trim()) {
      setGroups([]);
      setGroupsError(null);
      setIsGroupsLoading(false);
      return;
    }

    void loadGroups().catch(() => undefined);
  }, [enabled, instanceName, loadGroups]);

  return {
    groups,
    groupsError,
    isGroupsLoading,
    loadGroups,
  };
}
