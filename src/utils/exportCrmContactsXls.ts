import { crmLeadAssuntoLabels, type CrmLead } from '../types/crm';

type ExportCrmContactsXlsOptions = {
  searchTerm?: string;
};

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

const formulaPrefixPattern = /^[=+\-@]/;

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

function formatPhone(value: string | null) {
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

function getLeadResponsavelLabel(lead: CrmLead) {
  return lead.responsaveis[0]?.nome ?? lead.createdByUser?.nome ?? 'Definido automaticamente';
}

function getLeadCoResponsaveisLabel(lead: CrmLead) {
  return lead.coResponsaveis.length > 0 ? lead.coResponsaveis.map((responsavel) => responsavel.nome).join(', ') : '-';
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeExcelValue(value: unknown) {
  const normalized = value === null || value === undefined || value === '' ? '-' : String(value).replace(/\r?\n/g, ' ').trim();

  if (formulaPrefixPattern.test(normalized)) {
    return `'${normalized}`;
  }

  return normalized;
}

function toCell(value: unknown) {
  return escapeHtml(sanitizeExcelValue(value));
}

function buildFileName(hasSearchFilter: boolean) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const suffix = hasSearchFilter ? 'filtrados' : 'completos';

  return `contatos-crm-${suffix}-${year}-${month}-${day}.xls`;
}

export function exportCrmContactsXls(leads: CrmLead[], options: ExportCrmContactsXlsOptions = {}) {
  if (leads.length === 0) {
    throw new Error('Nao existem contatos visiveis para exportar.');
  }

  const trimmedSearchTerm = options.searchTerm?.trim() ?? '';
  const rows = leads.map((lead) => [
    lead.nome,
    formatPhone(lead.telefone),
    lead.email ?? '-',
    lead.assunto ? crmLeadAssuntoLabels[lead.assunto] : '-',
    lead.origem ?? '-',
    lead.pipeline?.nome ?? 'Pipeline nao informado',
    lead.stage?.nome ?? 'Etapa nao informada',
    getLeadResponsavelLabel(lead),
    getLeadCoResponsaveisLabel(lead),
    formatDate(lead.createdAt),
    formatDate(lead.updatedAt),
  ]);

  const headerCells = [
    'Nome',
    'Telefone',
    'E-mail',
    'Assunto',
    'Origem',
    'Pipeline',
    'Etapa atual',
    'Responsavel',
    'Co-responsaveis',
    'Cadastro',
    'Ultima atualizacao',
  ]
    .map((header) => `<th>${escapeHtml(header)}</th>`)
    .join('');

  const dataRows = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${toCell(cell)}</td>`).join('')}</tr>`)
    .join('');

  const workbookMarkup = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8" />
        <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>Contatos CRM</x:Name>
                  <x:WorksheetOptions>
                    <x:DisplayGridlines/>
                  </x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
        <![endif]-->
        <style>
          body { font-family: Arial, sans-serif; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #d7e3ee; padding: 8px; vertical-align: top; mso-number-format:"\\@"; }
          th { background: #ebf6ff; font-weight: 700; }
          .meta { margin-bottom: 16px; color: #355065; }
          .meta strong { display: block; margin-bottom: 4px; }
        </style>
      </head>
      <body>
        <div class="meta">
          <strong>Contatos do CRM</strong>
          <span>Gerado em ${escapeHtml(dateFormatter.format(new Date()))}</span>
          <br />
          <span>${escapeHtml(trimmedSearchTerm ? `Filtro aplicado: "${trimmedSearchTerm}"` : 'Sem filtro de busca aplicado')}</span>
        </div>
        <table>
          <thead>
            <tr>${headerCells}</tr>
          </thead>
          <tbody>
            ${dataRows}
          </tbody>
        </table>
      </body>
    </html>
  `.trim();

  const blob = new Blob(['\ufeff', workbookMarkup], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });
  const fileName = buildFileName(trimmedSearchTerm.length > 0);
  const blobUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = blobUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(blobUrl);
}
