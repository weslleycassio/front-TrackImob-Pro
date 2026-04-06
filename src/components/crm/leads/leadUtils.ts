import type { CrmLead, CrmLeadStageHistoryItem, CrmLeadUserSummary } from '../../../types/crm';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

export function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

export function formatPhone(value: string | null) {
  if (!value) {
    return 'Nao informado';
  }

  const digits = onlyDigits(value);

  if (digits.length === 11) {
    return digits.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  }

  if (digits.length === 10) {
    return digits.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  }

  return value;
}

export function formatCurrency(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return 'Nao informado';
  }

  return currencyFormatter.format(value);
}

export function calculateAge(date: string | null) {
  if (!date) {
    return null;
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - parsed.getFullYear();
  const monthDiff = today.getMonth() - parsed.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < parsed.getDate())) {
    age -= 1;
  }

  return Math.max(age, 0);
}

export function hasFinancialData(lead: CrmLead) {
  return lead.entrada !== null || lead.fgts !== null || lead.renda !== null || Boolean(lead.dataNascimento);
}

export function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export function getLeadOwners(lead: CrmLead) {
  const allOwners: CrmLeadUserSummary[] = [...lead.responsaveis];

  lead.coResponsaveis.forEach((user) => {
    if (!allOwners.some((owner) => String(owner.id) === String(user.id))) {
      allOwners.push(user);
    }
  });

  return allOwners;
}

export function truncateText(value: string, maxLength = 140) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trimEnd()}...`;
}

function toValidDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getHistoryEntryDate(historyItem: CrmLeadStageHistoryItem) {
  return toValidDate(historyItem.enteredAt ?? historyItem.movedAt ?? null);
}

function getHistorySortTimestamp(historyItem: CrmLeadStageHistoryItem) {
  return (
    getHistoryEntryDate(historyItem)?.getTime() ??
    toValidDate(historyItem.exitedAt ?? null)?.getTime() ??
    0
  );
}

export function formatDateTime(value?: string | null) {
  const parsed = toValidDate(value);
  return parsed ? dateTimeFormatter.format(parsed) : 'Nao informado';
}

export function formatDuration(value: number | null | undefined, options?: { compact?: boolean }) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 'Nao informado';
  }

  const normalizedMinutes = Math.max(Math.floor(value / 60000), 0);

  if (normalizedMinutes <= 0) {
    return options?.compact ? '< 1 min' : 'Menos de 1 minuto';
  }

  const days = Math.floor(normalizedMinutes / (24 * 60));
  const hours = Math.floor((normalizedMinutes % (24 * 60)) / 60);
  const minutes = normalizedMinutes % 60;

  if (options?.compact) {
    if (days > 0) {
      return hours > 0 && days < 3 ? `${days}d ${hours}h` : `${days}d`;
    }

    if (hours > 0) {
      return minutes > 0 && hours < 6 ? `${hours}h ${minutes}min` : `${hours}h`;
    }

    return `${minutes}min`;
  }

  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days} ${days === 1 ? 'dia' : 'dias'}`);
  }

  if (hours > 0) {
    parts.push(`${hours}h`);
  }

  if (minutes > 0 && days === 0) {
    parts.push(`${minutes}min`);
  }

  return parts.join(' e ');
}

export function getSortedLeadStageHistory(lead: CrmLead) {
  return [...(lead.stageHistory ?? [])].sort((left, right) => getHistorySortTimestamp(right) - getHistorySortTimestamp(left));
}

export function getCurrentStageHistoryItem(lead: CrmLead) {
  const currentStageId = String(lead.stageId);
  const matchingHistory = (lead.stageHistory ?? []).filter((item) => {
    const historyStageId = item.toStage?.id !== undefined ? String(item.toStage.id) : String(item.toStageId);
    return historyStageId === currentStageId;
  });

  if (matchingHistory.length === 0) {
    return null;
  }

  const sortedHistory = [...matchingHistory].sort((left, right) => getHistorySortTimestamp(right) - getHistorySortTimestamp(left));

  return sortedHistory.find((item) => item.isCurrent === true) ?? sortedHistory.find((item) => !item.exitedAt) ?? sortedHistory[0];
}

export function getLeadCurrentStageEnteredAt(lead: CrmLead) {
  const directValue = toValidDate(lead.enteredCurrentStageAt ?? null);
  if (directValue) {
    return lead.enteredCurrentStageAt ?? null;
  }

  const historyItem = getCurrentStageHistoryItem(lead);
  const historyValue = historyItem?.enteredAt ?? historyItem?.movedAt ?? null;

  return toValidDate(historyValue) ? historyValue : null;
}

export function getLeadCurrentStageDurationMs(lead: CrmLead, referenceTime = Date.now()) {
  const enteredAt = getLeadCurrentStageEnteredAt(lead);
  const parsedEntry = toValidDate(enteredAt);

  if (parsedEntry) {
    return Math.max(referenceTime - parsedEntry.getTime(), 0);
  }

  if (lead.currentStageDurationMs !== null && lead.currentStageDurationMs !== undefined && Number.isFinite(lead.currentStageDurationMs)) {
    return Math.max(lead.currentStageDurationMs, 0);
  }

  const historyItem = getCurrentStageHistoryItem(lead);
  if (historyItem?.durationMs !== null && historyItem?.durationMs !== undefined && Number.isFinite(historyItem.durationMs)) {
    return Math.max(historyItem.durationMs, 0);
  }

  return null;
}
