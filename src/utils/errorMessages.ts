import axios from 'axios';

export const IMOVEL_ACTION_FORBIDDEN_MESSAGE = 'Voce nao tem permissao para realizar esta acao neste imovel.';

export function toFriendlyError(error: unknown, fallback = 'Ocorreu um erro inesperado.') {
  if (axios.isAxiosError(error)) {
    const apiMessage = (error.response?.data as { message?: string })?.message;

    if (error.response?.status === 401) {
      return 'Credenciais inválidas. Verifique e tente novamente.';
    }

    if (apiMessage) return apiMessage;

    if (!error.response) {
      return 'Não foi possível conectar ao servidor. Verifique se a API está disponível.';
    }
  }

  return fallback;
}

export function toImovelActionError(error: unknown, fallback: string) {
  if (axios.isAxiosError(error) && error.response?.status === 403) {
    return IMOVEL_ACTION_FORBIDDEN_MESSAGE;
  }

  return toFriendlyError(error, fallback);
}
