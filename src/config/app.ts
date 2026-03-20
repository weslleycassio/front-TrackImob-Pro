const DEFAULT_APP_NAME = 'WBG Gerenciamento Imobiliário';

export const APP_NAME = (import.meta.env.VITE_APP_NAME || DEFAULT_APP_NAME).trim() || DEFAULT_APP_NAME;
export const APP_DESCRIPTION =
  'Plataforma profissional para gestão imobiliária, carteira de imóveis, equipe e operação comercial.';
export const APP_FOOTER_TEXT = `© ${new Date().getFullYear()} ${APP_NAME}. Todos os direitos reservados.`;

export function setDocumentTitle(pageTitle?: string) {
  document.title = pageTitle ? `${pageTitle} | ${APP_NAME}` : APP_NAME;
}
