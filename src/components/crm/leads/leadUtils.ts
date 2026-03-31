import type { CrmLead, CrmLeadUserSummary } from '../../../types/crm';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
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
